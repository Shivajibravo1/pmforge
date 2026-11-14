import { describe, expect, it } from "vitest";
import { badges, formFor, formProgress, nextForm } from "./gamify";

describe("gamify", () => {
  it("maps XP to the right form at each threshold", () => {
    expect(formFor(0).tier).toBe(1);
    expect(formFor(149).tier).toBe(1);
    expect(formFor(150).tier).toBe(2);
    expect(formFor(2650).tier).toBe(7);
  });
  it("reports progress to the next form and caps at 100", () => {
    expect(formProgress(0)).toBe(0);
    expect(formProgress(75)).toBe(50);
    expect(nextForm(2500)).toBeNull();
    expect(formProgress(2650)).toBe(100);
  });
  it("awards badges from progress", () => {
    const b = badges({ completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], streak: 3, total_xp: 200 });
    const earned = b.filter((x) => x.earned).map((x) => x.id);
    expect(earned).toEqual(["first", "free", "streak3"]);
  });
});
