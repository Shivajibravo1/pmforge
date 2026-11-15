import { describe, expect, it } from "vitest";
import { collectNotes } from "./notes";

function store(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => entries[k] ?? null };
}

describe("collectNotes", () => {
  it("returns only earlier days, newest first, ignoring blanks and other keys", () => {
    const s = store({
      "pmforge:journal:3:5": "third day note",
      "pmforge:journal:1:2": "first day note",
      "pmforge:journal:7:1": "future note",
      "pmforge:journal:4:1": "   ",
      "other:key": "x",
    });
    expect(collectNotes(5, s)).toEqual([{ day: 3, text: "third day note" }, { day: 1, text: "first day note" }]);
  });
  it("joins several answers from the same day", () => {
    const s = store({ "pmforge:journal:2:1": "a", "pmforge:journal:2:4": "b" });
    expect(collectNotes(3, s)).toEqual([{ day: 2, text: "a\n\nb" }]);
  });
});
