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
    block = cf[cf.index("handle @api"):cf.index("reverse_proxy backend:8000")]
    assert "request_body" in block and "max_size 64KiB" in block
