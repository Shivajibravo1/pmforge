const ALIASES = new Set(["prefer", "require", "verify-ca"]);

/**
 * node-postgres warns that sslmode prefer, require and verify-ca will change meaning to verify-full.
 * Managed hosts such as Neon present valid public certificates, so state verify-full explicitly:
 * the connection stays encrypted and the server identity is checked, and the warning goes away.
 * Other modes (disable, no sslmode, verify-full) are left as they are.
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { return raw; }
  const mode = url.searchParams.get("sslmode");
  if (!mode || !ALIASES.has(mode) || url.searchParams.has("uselibpqcompat")) return raw;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
