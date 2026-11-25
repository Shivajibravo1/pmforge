# Self-hosted build (Hostinger VPS). Vercel does not use this file.
FROM node:25-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
COPY . .
# Placeholders let Next collect route data at build time. Real values come from the compose environment at runtime.
RUN BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-only-placeholder-not-a-secret-0000 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npm run build
# Used once per release by the compose "auth-migrate" service.
CMD ["node", "--experimental-strip-types", "scripts/migrate-auth.ts"]

FROM node:25-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --create-home --uid 10001 app
COPY --from=builder --chown=app /app/.next/standalone ./
COPY --from=builder --chown=app /app/.next/static ./.next/static
COPY --from=builder --chown=app /app/public ./public
USER 10001
EXPOSE 3000
CMD ["node", "server.js"]
