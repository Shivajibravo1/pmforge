import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// The auth-migrate container runs scripts/migrate-auth.ts with node --experimental-strip-types, which loads
// src/lib/auth.ts and everything it imports. Syntax that needs a TypeScript transform breaks the deploy.
describe("modules loaded by the migrate image", () => {
  it.each(["email-throttle", "enrollment", "db-url"])("%s runs under node type stripping", (name) => {
    const out = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", "-e", `import("./src/lib/${name}.ts").then(()=>console.log("ok"))`],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(out.trim()).toBe("ok");
  });
});
