#!/usr/bin/env bash
# Local end to end stack: throwaway Postgres for Better Auth, SQLite for the API, Next.js and FastAPI.
# Test values only. Sign-in codes are read from the frontend log, so no email service is used.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_PORT=54329
PGDIR=/tmp/pmforge-e2e-pg
LOG=/tmp/pmforge-e2e-frontend.log
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)

if [ ! -d "$PGDIR" ]; then
  install -d -o postgres -g postgres "$PGDIR"
  su postgres -c "$PGBIN/initdb -D $PGDIR -A trust >/dev/null"
fi
su postgres -c "$PGBIN/pg_ctl -D $PGDIR -o '-p $PG_PORT -k /tmp' -l /tmp/pmforge-e2e-pg.log start >/dev/null" || true
for _ in $(seq 1 30); do "$PGBIN/pg_isready" -h 127.0.0.1 -p $PG_PORT >/dev/null 2>&1 && break; sleep 1; done
psql -h 127.0.0.1 -p $PG_PORT -U postgres -tc "select 1 from pg_database where datname='pmforge_e2e'" | grep -q 1 \
  || psql -h 127.0.0.1 -p $PG_PORT -U postgres -c "create database pmforge_e2e" >/dev/null

export DATABASE_URL="postgres://postgres@127.0.0.1:$PG_PORT/pmforge_e2e"
export BETTER_AUTH_URL="http://localhost:3100"
export BETTER_AUTH_SECRET="e2e-only-secret-not-for-any-real-environment-0123456789"
export AUTH_TEST_EMAILS="e2e@example.com"
export NEXT_PUBLIC_API_URL="http://localhost:8100"
unset RESEND_API_KEY EMAIL_FROM PMFORGE_LIVE

cd "$ROOT/frontend"
npm run auth:migrate >/dev/null

rm -f /tmp/pmforge-e2e-api.db
(
  cd "$ROOT/backend"
  export ENV=development DATABASE_URL="sqlite:////tmp/pmforge-e2e-api.db" CORS_ORIGINS="http://localhost:3100"
  export JWKS_URL="http://localhost:3100/api/auth/jwks" JWT_ISSUER="http://localhost:3100" JWT_AUDIENCE="pmforge-api"
  exec .venv/bin/python -m uvicorn app.main:app --port 8100 --log-level warning
) &
API=$!
trap 'kill $API 2>/dev/null || true' EXIT

: > "$LOG"
npx next dev --port 3100 2>&1 | tee "$LOG"
