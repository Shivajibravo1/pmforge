# OWASP mapping and open gaps

Honest status, not a certification. "Met" means a control exists in code or config and is tested or checked in CI.
"Partial" means a control exists with a known limit. "Open" means not done. Framework editions were checked online
on 2026-11-19; confirm the current edition before an audit.

Frameworks covered: Top 10:2025 (web), API Security Top 10:2023, Top 10 for LLM Applications 2025, Agentic and
ML guidance (scoped), ASVS (see end).

## Top 10:2025 (web application)

| ID | Risk | Status | Evidence / gap |
|---|---|---|---|
| A01 | Broken access control | Met | Roles read from DB, admin gated by `require_admin`, artifact ownership check (same 404 for foreign), tier gate on lessons, role revoked when email leaves `ADMIN_EMAILS` |
| A02 | Security misconfiguration | Partial | HSTS, CSP nonce, API CSP `default-src 'none'`, docs off in prod, Cloudflare-only firewall, containers drop capabilities. Open: read-only root filesystems, DB password strength, rotate exposed keys |
| A03 | Software supply chain failures | Partial | pip-audit, npm audit gate, gitleaks, Dependabot. Open: image scan and SBOM (not enabled), pin Actions and images by digest |
| A04 | Cryptographic failures | Partial | TLS at Cloudflare and Caddy, JWT EdDSA/RS256/ES256 allowlist. Open: DB traffic is unencrypted inside the Docker network, uploads are not encrypted at rest |
| A05 | Injection | Met | SQLAlchemy parameters, LIKE wildcards escaped, HTML escaped in emails, no `dangerouslySetInnerHTML` in the frontend |
| A06 | Insecure design | Partial | Spend caps, consent record, opt-in email, one-email-a-day rule. Open: no formal threat model document |
| A07 | Authentication failures | Met | Email OTP only, per-email OTP throttle, JWT `exp`/`sub` required, issuer and audience checked |
| A08 | Software or data integrity failures | Partial | Magic-byte file sniffing, SVG refused. Open: image signing and digest pinning |
| A09 | Logging and alerting failures | Partial | Auth rejections, moderation blocks, leak blocks and admin uploads and sends are logged without emails or tokens. Open: no central log store or alert rules |
| A10 | Mishandling of exceptional conditions | Met | JWKS and moderation failures fail closed, send failures revert state, no stack traces returned |

## API Security Top 10:2023

| ID | Risk | Status | Evidence / gap |
|---|---|---|---|
| API1 | Broken object level authorization | Met | Every object read checks the owner; public objects use unguessable ids |
| API2 | Broken authentication | Met | See A07 |
| API3 | Broken object property level authorization | Met | Explicit response views, no email or user id on public portfolio, no artifact text in admin detail |
| API4 | Unrestricted resource consumption | Met | 64 KiB body cap, 5 MiB upload cap, per-client rate limit, per-user and global AI budgets, daily artifact cap |
| API5 | Broken function level authorization | Met | All admin routers carry `require_admin` |
| API6 | Unrestricted access to sensitive business flows | Partial | OTP throttle, daily email cap, AI caps. Open: signup abuse by many addresses |
| API7 | Server-side request forgery | Met | The server fetches only fixed URLs (JWKS, Resend, OpenAI) |
| API8 | Security misconfiguration | Partial | See A02 |
| API9 | Improper inventory management | Met | One API version, `/docs` and OpenAPI off in production |
| API10 | Unsafe consumption of APIs | Met | Provider errors are handled, bodies are not logged, structured output is validated again |

## Top 10 for LLM Applications 2025

| ID | Risk | Status | Evidence / gap |
|---|---|---|---|
| LLM01 | Prompt injection | Partial | Random delimiters, bracket neutralising, fixed rules, moderation. Injection can never be fully removed, so impact is limited (LLM06) |
| LLM02 | Sensitive information disclosure | Met | Secrets and personal data redacted before the model; admin views exclude artifact text |
| LLM03 | Supply chain | Partial | Hosted models only. Model names are config. Open: pin model versions and review provider changes |
| LLM04 | Data and model poisoning | N/A | No training or fine-tuning on user data |
| LLM05 | Improper output handling | Met | Strict JSON schema plus pydantic, output sanitised, rendered as text, no HTML or links allowed |
| LLM06 | Excessive agency | Met | The model has no tools, no database access and no actions |
| LLM07 | System prompt leakage | Met | Canary marker and phrase check block leaks. No secrets are in prompts |
| LLM08 | Vector and embedding weaknesses | N/A | No vector store or retrieval |
| LLM09 | Misinformation | Partial | Prompt forbids invented sources and advice; replies say when uncertain. Open: no human review of model answers |
| LLM10 | Unbounded consumption | Met | Reserve-then-settle budgets per user and platform, token caps, request caps |

## Agentic, ML and other OWASP projects

| Project | Status |
|---|---|
| Agentic AI threats | N/A: no agents, tools, memory or multi-agent flows. Revisit before adding any |
| ML Security Top 10 | N/A: no self-hosted models |
| Docker and Kubernetes guidance | Partial: non-root users, dropped capabilities, internal-only network. Open: read-only filesystems, resource limits |
| CI/CD security | Partial: least-privilege workflow token, secret scan. Open: pinned Actions |
| ASVS | Not assessed per requirement. The controls above cover the main Level 1 areas; a full ASVS pass needs a dedicated review |

## Open items, in priority order

1. Rotate the OpenAI key, the Resend key and `BETTER_AUTH_SECRET` (values were exposed in a chat read). Owner: you, in hPanel.
2. Replace the database password with a long random one, with a planned restart. Owner: you and Claude together.
3. Add an image vulnerability scan and SBOM. Do not use `aquasecurity/trivy-action` tags older than 0.35.0: they were hijacked in March 2026. Pin any scanner action to a full commit hash.
4. Add log shipping and alert rules (failed logins, 429 spikes, `ai_capacity_reached`).
5. Read-only root filesystems and memory limits for containers, after testing on a copy.
6. Write a short threat model, then run a full ASVS Level 1 review.
7. Independent penetration test before heavy paid marketing.
