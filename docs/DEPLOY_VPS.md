# Deploy PMForge to the Hostinger VPS

Stack: Caddy (automatic HTTPS) -> Next.js frontend + FastAPI backend -> Postgres 17, one Docker Compose project. Only Caddy publishes ports (80, 443). Compose file: `deploy/docker-compose.yml`.

## Security considerations
- Secrets live only in the hPanel Docker Manager project environment. Never commit them or paste them in chat.
- Postgres has no published port and sits on the internal network.
- Use a hex `POSTGRES_PASSWORD` (`openssl rand -hex 24`) so the URL needs no escaping.
- Restrict the VPS firewall to TCP 22, 80 and 443.
- Backend verifies JWTs against the frontend JWKS at `http://frontend:3000/api/auth/jwks` (internal), issuer `https://<DOMAIN>`, audience `pmforge-api`.

## Cloudflare in front (needed for automatic INR or USD)
The landing page picks the price currency from the `cf-ipcountry` header that Cloudflare adds. Without Cloudflare everyone sees USD first (the toggle still works). Caddy passes the header through only when the connection comes from a Cloudflare address (ranges in the Caddyfile in `deploy/docker-compose.yml`, from `https://www.cloudflare.com/ips/`, last updated by Cloudflare on 28 Sep 2023). For any other source Caddy deletes `Cf-Connecting-Ip` and `Cf-Ipcountry`, so a visitor who reaches the VPS directly cannot forge their address or country. Re-check those ranges when Cloudflare publishes a change.
1. Add `pmforge.pm` to a Cloudflare account and switch the registrar nameservers to the two Cloudflare gives you.
2. DNS records `A pmforge.pm` and `CNAME www` stay as in Prerequisites, with the orange cloud (Proxied) on.
3. SSL/TLS mode: **Full (strict)**. Caddy keeps its own certificate, so the origin stays encrypted.
4. Firewall: in the Hostinger VPS firewall allow TCP 80 and 443 only from Cloudflare's published ranges (lists at `https://www.cloudflare.com/ips/`), plus 22 from your own address. This is defence in depth with the Caddy header stripping above, and it also stops direct attacks on the origin. Re-check the ranges every few months.
5. Check: open `https://pmforge.pm` from India and from another country (or a VPN). The currency toggle should start on INR in India and USD elsewhere.
6. Do not turn on Cloudflare "Always Use HTTPS" caching rules for `/api/*`, `/sign-in` or `/app`. Leave caching at the default (dynamic pages are not cached).

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

## Abuse limits (what they do and do not cover)
- Sign-in codes: Better Auth limits per client address and path, and `frontend/src/lib/email-throttle.ts` limits per target email (5 code requests and 10 code attempts per hour). The email counters are in memory: they reset when the frontend container restarts and are not shared between instances.
- Request bodies: Caddy rejects API bodies over 64 KiB and the backend enforces the same cap (`MAX_BODY_BYTES`).
- AI spend: each mentor call reserves its worst-case cost and one daily slot before the model runs. Failed calls that reached the model still count. Global ceilings `GLOBAL_DAILY_AI_BUDGET_USD` (default 5) and `GLOBAL_MONTHLY_AI_BUDGET_USD` (default 50) stop all users with `ai_capacity_reached`. Set them in hPanel to match the OpenAI billing limit.

## Daily interview question email

- **Who gets it:** paid members who tick the consent box on the You page. The opt-in time and consent text version are stored in `interview_subscriptions`; turning it off keeps the row as the record.
- **How emails are captured:** the account email is saved at sign-in. Nothing else is collected and no list is uploaded anywhere. The sender reads the member's email from the database at send time.
- **What is sent:** at most one email per member per day, from 7:00 India time, by the `interview-mailer` service (Docker Manager shows it as a separate container). A question you wrote for that date (admin API `/api/v1/admin/interview-questions/{YYYY-MM-DD}`) is used first. A date with no question uses the built-in bank of lesson interview questions in rotation.
- **Limit:** `INTERVIEW_EMAIL_DAILY_CAP` (default 80). The free Resend plan allows 100 emails a day in total and sign-in codes count against the same 100, so keep this below it.
- **Unsubscribe:** every email has a link to `/unsubscribe/<token>` (one button) and a one-click `List-Unsubscribe` header. A member who fails 5 sends in a row is paused automatically.
- **Check:** `docker logs <project>-interview-mailer-1` shows `pass done` lines. Email addresses are never logged.
- **Before you rely on it:** confirm in Resend's current terms that daily educational email to opted-in members is allowed through the sending API, and that the `headers` field is accepted. I could not verify either from here.

## Images and PDFs

There is no separate Resources panel and no member Resources page. Images and the PDF attachment are uploaded from your
computer inside the Email composer (PNG, JPG or PDF, up to 5 MB). An image used in an email gets a public link so mail
apps can show it; PDFs are only ever attached. Members cannot browse or download uploads. The file type is decided from
the file's own first bytes, never from its name.

## Email composer

- **Where:** top menu, "Admin" (admins only), then "Email composer".
- **What an email has:** subject, send date and hour (India time), text and image blocks in any order, and one optional PDF sent as a real attachment (PDF up to 5 MB; images are uploaded inline and made public for email).
- **Status:** draft (saved, never sent), scheduled (sends at the chosen hour), sent, partial (the day ended before every subscriber was reached, usually because of the daily cap).
- **One email a day:** a scheduled email replaces that day's interview question for everyone, so a subscriber never gets two. Only one email can be scheduled per date.
- **Audience:** members who turned on the email on their You page. Subscribers agreed to interview-practice email, so keep content to that purpose.
- **Send test to me:** sends the saved email to the admin's own address only. It counts toward Resend's daily limit.
- **Check before relying on it:** confirm Resend accepts attachments through the sending API with your plan, and the 100 emails per day free limit against your subscriber count.

## Subscribers

Admin, then Subscribers. Paid and Free tabs list every member with an "Opted in" badge. Tick people (or "Select all who
opted in") and press Send to send today's interview email now. Only members who opted in can be ticked, each member gets
at most one email a day (a manual send uses up that day's email), and the daily cap still applies. Free members cannot
opt in today, so the Free tab only becomes selectable for a free member who had opted in while on a paid plan.
