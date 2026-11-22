import { describe, expect, it } from "vitest";
import { type Col, computed, raciProblems, safeCell, toCsv } from "./templates";

const cols: Col[] = [
  { key: "risk", label: "Risk", hint: "", kind: "text" },
  { key: "l", label: "Likelihood", hint: "", kind: "number" },
  { key: "i", label: "Impact", hint: "", kind: "number" },
  { key: "s", label: "Score", hint: "", kind: "product:l,i" },
];

describe("templates helpers", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(safeCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("Normal text")).toBe("Normal text");
  });
  it("calculates a product column and leaves blanks blank", () => {
    expect(computed(cols[3], { l: "3", i: "4" })).toBe("12");
    expect(computed(cols[3], { l: "3", i: "" })).toBe("");
    expect(computed(cols[0], { risk: "x" })).toBeNull();
  });
  it("writes quoted CSV with the calculated score and escaped quotes", () => {
    const csv = toCsv(cols, [{ risk: 'Say "hi"', l: "2", i: "5" }]);
    expect(csv.split("\r\n")).toEqual(['"Risk","Likelihood","Impact","Score"', '"Say ""hi""","2","5","10"']);
  });
  it("flags RACI rows without exactly one A", () => {
    const rc: Col[] = ["Activity", "PM", "Dev"].map((l) => ({ key: l, label: l, hint: "", kind: "text" }));
    expect(raciProblems(rc, [{ Activity: "Build", PM: "A", Dev: "R" }, { Activity: "Test", PM: "A", Dev: "A" }, { Activity: "Ship", PM: "R", Dev: "R" }])).toEqual(["Test", "Ship"]);
  });
});
