export type Col = { key: string; label: string; hint: string; kind: string };
export type Row = Record<string, string>;

/** A spreadsheet program treats a cell that starts with = + - or @ as a formula. Prefix it so pasted text stays text. */
export function safeCell(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

export function toCsv(cols: Col[], rows: Row[]): string {
  const esc = (v: string) => `"${safeCell(v).replace(/"/g, '""')}"`;
  const head = cols.map((c) => esc(c.label)).join(",");
  return [head, ...rows.map((r) => cols.map((c) => esc(computed(c, r) ?? r[c.key] ?? "")).join(","))].join("\r\n");
}

/** A `product:a,b` column is calculated from two number columns. Returns null for ordinary columns. */
export function computed(c: Col, r: Row): string | null {
  if (!c.kind.startsWith("product:")) return null;
  const [a, b] = c.kind.slice(8).split(",");
  const x = Number(r[a]);
  const y = Number(r[b]);
  return Number.isFinite(x) && Number.isFinite(y) && r[a] !== "" && r[b] !== "" ? String(x * y) : "";
}

/** RACI check: every row needs exactly one A. Returns the labels of rows that break the rule. */
export function raciProblems(cols: Col[], rows: Row[]): string[] {
  const roleKeys = cols.slice(1).map((c) => c.key);
  return rows.filter((r) => r[cols[0].key]?.trim() && roleKeys.filter((k) => r[k]?.trim().toUpperCase() === "A").length !== 1)
    .map((r) => r[cols[0].key]);
}
