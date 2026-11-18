# Deploy PMForge to the Hostinger VPS

Stack: Caddy (automatic HTTPS) -> Next.js frontend + FastAPI backend -> Postgres 17, one Docker Compose project. Only Caddy publishes ports (80, 443). Compose file: `deploy/docker-compose.yml`.

## Security considerations
- Secrets live only in the hPanel Docker Manager project environment. Never commit them or paste them in chat.
- Postgres has no published port and sits on the internal network.
- Use a hex `POSTGRES_PASSWORD` (`openssl rand -hex 24`) so the URL needs no escaping.
- Restrict the VPS firewall to TCP 22, 80 and 443.
- Backend verifies JWTs against the frontend JWKS at `http://frontend:3000/api/auth/jwks` (internal), issuer `https://<DOMAIN>`, audience `pmforge-api`.

## Prerequisites
1. DNS: `A pmforge.pm -> 189.72.156.9`, `CNAME www -> pmforge.pm`. Wait for propagation.
2. Resend: domain verified, `EMAIL_FROM` on that domain, a fresh API key.
3. OpenAI key with a billing limit.

## Project environment (hPanel > VPS > Docker Manager)
| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | hex string |
| `BETTER_AUTH_SECRET` | 32+ random characters (`openssl rand -base64 32`) |
| `OPENAI_API_KEY` | your key |
| `RESEND_API_KEY` | your key |
| `EMAIL_FROM` | e.g. `PMForge <login@pmforge.pm>` |
| `AUTH_TEST_EMAILS` | optional |
| `ADMIN_EMAILS` | defaults to `aishivajibravo@gmail.com` |
| `DOMAIN` | defaults to `pmforge.pm` |

## Images
Hostinger's Docker Manager pulls images and does not build from source. GitHub Actions (`.github/workflows/images.yml`) builds three images on every push to `main` and publishes them to `ghcr.io/shivajibravo1/`: `pmforge-backend`, `pmforge-frontend`, `pmforge-frontend-migrate`. After the first run, set each package to Public (GitHub profile > Packages > package > Package settings > Change visibility), or the VPS cannot pull them.

## Steps
1. hPanel > VPS > Docker Manager > Compose > From URL: `https://raw.githubusercontent.com/Shivajibravo1/pmforge/main/deploy/docker-compose.yml`, project name `pmforge`.
2. Add the environment above, then deploy. The first build takes several minutes.
3. Order at start: postgres healthy, `backend-migrate` (Alembic), `auth-migrate` (Better Auth tables), backend, frontend, caddy.
4. Check `https://pmforge.pm/health`, sign in with the admin email, open any lesson.

## Update
Push to `main`, wait for the Actions run to finish, then redeploy the project in Docker Manager so it pulls `latest`. Migrations run on each start.

## Backups
**What runs.** The `backup` service in the compose file dumps the database when the project starts, then every 24 hours. It keeps 7 days of daily dumps and 4 weeks of Sunday dumps in `/var/backups/pmforge/daily` and `/var/backups/pmforge/weekly` on the VPS host. Each dump is custom format (`pg_dump -Fc`), is checked with `pg_restore -l` before it is kept, and is readable by root only. A failed dump leaves no file and logs `backup FAILED` in the `backup` container log.

**Health.** The `backup` container shows Unhealthy in Docker Manager when the newest daily dump is older than 26 hours. Check it weekly.

**Limits, stated plainly.** This is a same-server backup. It protects against a bad deploy, a bad migration, a deleted row or a corrupted database. It does not protect against losing the VPS, the Hostinger account or the disk. Recovery point is up to 24 hours. Mitigations at no extra cost:
- Enable the Hostinger weekly VPS backup in hPanel (a second layer on the same provider). A disk snapshot taken while Postgres writes may be inconsistent, so treat it as a fallback, not the main copy.
- Once a month, copy the newest weekly dump to your own computer: `scp root@<VPS-IP>:/var/backups/pmforge/weekly/<newest-file> .` The dump holds learner emails, so keep it on an encrypted disk.
- Revisit off-site storage when the first paying users arrive.

**Restore test (monthly, does not touch live data).** Replace `<file>` with a dump name.

    docker exec pmforge-postgres-1 createdb -U pmforge restore_test
    docker exec -i pmforge-postgres-1 pg_restore -U pmforge --no-owner -d restore_test < /var/backups/pmforge/daily/<file>
    docker exec pmforge-postgres-1 psql -U pmforge -d restore_test -Atc "select count(*) from users"
    docker exec pmforge-postgres-1 dropdb -U pmforge restore_test

The count should be close to the live count (`-d pmforge`). Record the date of each test.

**Restore for real (data loss or corruption).** Stop the app first so nothing writes during the restore.

    docker stop pmforge-frontend-1 pmforge-backend-1
    docker exec pmforge-postgres-1 dropdb -U pmforge pmforge
    docker exec pmforge-postgres-1 createdb -U pmforge pmforge
    docker exec -i pmforge-postgres-1 pg_restore -U pmforge --no-owner -d pmforge < /var/backups/pmforge/daily/<file>
    docker start pmforge-backend-1 pmforge-frontend-1

Then open `https://pmforge.pm/health` and sign in. Do not delete the Docker Manager project to "reset": the dumps live on the host, but follow this order anyway.

## Monitoring
Docker Manager logs per project, `https://pmforge.pm/health` from an external uptime check, and the AI spend cap in the backend (`monthly_ai_budget_usd`).

## Risks
- Single server: no failover. Mitigate with backups and a rebuild runbook.
- `latest` follows `main`: a bad push can break a redeploy. Set `IMAGE_TAG` to a commit SHA to pin.
- Docker bypasses host firewalls such as ufw. Use the Hostinger firewall.

## Rollback
Set `IMAGE_TAG` to a previous commit SHA in the project environment and redeploy. Database rollback uses the latest dump.
