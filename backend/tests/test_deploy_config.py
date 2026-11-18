"""Static checks on deploy/docker-compose.yml (security review F1, F2). Caddy itself is not run here."""
import ipaddress
import re
from pathlib import Path

COMPOSE = (Path(__file__).resolve().parents[2] / "deploy" / "docker-compose.yml").read_text()


def _caddyfile() -> str:
    return COMPOSE[COMPOSE.index("caddyfile:"):]


def test_cf_headers_are_stripped_unless_peer_is_cloudflare():
    cf = _caddyfile()
    m = re.search(r"@notcf not remote_ip ([^\n]+)", cf)
    assert m, "missing @notcf matcher"
    nets = [ipaddress.ip_network(x) for x in m.group(1).split()]  # raises on any invalid CIDR
    assert any(n.version == 4 for n in nets) and any(n.version == 6 for n in nets)
    assert ipaddress.ip_network("104.16.0.0/13") in nets
    assert "request_header @notcf -Cf-Connecting-Ip" in cf
    assert "request_header @notcf -Cf-Ipcountry" in cf


def test_no_unescaped_dollar_in_caddyfile():
    # Compose interpolates $VAR inside configs.content, so every literal dollar must be doubled.
    assert not re.search(r"(?<!\$)\$(?!\$)", _caddyfile())


def test_api_handle_caps_request_body():
    cf = _caddyfile()
    start = cf.index("handle @api")
    block = cf[start:cf.index("reverse_proxy backend:8000", start)]
    assert "request_body" in block and "max_size 64KiB" in block


def test_interview_mailer_service_is_wired():
    block = COMPOSE[COMPOSE.index("  interview-mailer:"):COMPOSE.index("  backup:")]
    assert '"app.jobs.interview_email"' in block
    assert "restart: unless-stopped" in block
    assert "backend-migrate: { condition: service_completed_successfully }" in block
    for var in ("RESEND_API_KEY", "EMAIL_FROM", "PUBLIC_BASE_URL", "DATABASE_URL"):
        assert var in block
    assert "ports:" not in block  # nothing listens; it only sends


def test_only_the_upload_route_may_take_a_large_body():
    cf = _caddyfile()
    up = cf[cf.index("@upload path"):cf.index("handle @api")]
    assert "/api/v1/admin/resources" in up and "max_size 6MiB" in up
    assert cf.index("handle @upload") < cf.index("handle @api")  # first match wins
    assert "max_size 64KiB" in cf[cf.index("handle @api"):]


def test_backend_service_can_send_test_emails():
    block = COMPOSE[COMPOSE.index("\n  backend:\n"):COMPOSE.index("  interview-mailer:")]
    for var in ("RESEND_API_KEY", "EMAIL_FROM", "PUBLIC_BASE_URL"):
        assert var in block


def test_app_containers_drop_privileges():
    """OWASP A02 / container hardening: no extra privileges and no Linux capabilities for our own services."""
    for name in ("backend-migrate", "auth-migrate", "backend", "frontend", "interview-mailer"):
        block = COMPOSE.split(f"\n  {name}:\n", 1)[1].split("\n\n", 1)[0]
        assert "no-new-privileges:true" in block and "cap_drop: [ALL]" in block, name
