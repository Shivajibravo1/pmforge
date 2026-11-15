# PMForge

Build proof, not notes. IT Project Manager learning app.

Phase A: build, secure, test and validate on a Vercel preview.
Governance: AGENTS.md, MASTER_RULEBOOK.md, CHECKLISTS.md.

## End to end tests (Playwright)

`cd frontend && npm run e2e` starts a throwaway local stack (`frontend/e2e/stack.sh`: Postgres for sign-in, SQLite for the API, Next.js on 3100, FastAPI on 8100) and runs the browser tests on the installed Google Chrome. Sign-in codes are read from the frontend log, so no email service or real data is used. The script needs a Linux machine with PostgreSQL installed, and root access to run it as the `postgres` user. To run only the public smoke tests against a deployed site, set `E2E_BASE_URL`; the deployed site never exposes sign-in codes, so the signed-in tests are skipped there.
