/** Creates or updates the Better Auth tables. Run once per environment: npm run auth:migrate */
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth.ts";

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
console.info(`tables to create: ${toBeCreated.length}, columns to add: ${toBeAdded.length}`);
await runMigrations();
console.info("auth migration complete");
process.exit(0);
