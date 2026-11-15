import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "./db-url";

describe("normalizeDatabaseUrl", () => {
  it.each(["require", "prefer", "verify-ca"])("upgrades sslmode=%s to verify-full", (m) => {
    expect(normalizeDatabaseUrl(`postgresql://u:p@host.example/db?sslmode=${m}&channel_binding=require`))
      .toBe("postgresql://u:p@host.example/db?sslmode=verify-full&channel_binding=require");
  });
  it("leaves other URLs alone", () => {
    for (const u of ["postgres://postgres@127.0.0.1:54329/db", "postgresql://u:p@h/db?sslmode=verify-full",
      "postgresql://u:p@h/db?sslmode=disable", "postgresql://u:p@h/db?sslmode=require&uselibpqcompat=true", "not a url"]) {
      expect(normalizeDatabaseUrl(u)).toBe(u);
    }
  });
});
