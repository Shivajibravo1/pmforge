export type Note = { day: number; text: string };

const KEY = /^pmforge:journal:(\d+):(\d+)$/;

/** Journal answers saved on this device for lessons before `day`, newest day first. */
export function collectNotes(before: number, storage: Pick<Storage, "length" | "key" | "getItem">): Note[] {
  const byDay = new Map<number, string[]>();
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    const m = k ? KEY.exec(k) : null;
    if (!k || !m) continue;
    const day = Number(m[1]);
    const text = (storage.getItem(k) ?? "").trim();
    if (day >= before || !text) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), text]);
  }
  return [...byDay.entries()].sort((a, b) => b[0] - a[0]).map(([day, t]) => ({ day, text: t.join("\n\n") }));
}
