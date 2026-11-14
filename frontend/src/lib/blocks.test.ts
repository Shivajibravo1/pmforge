import { describe, expect, it } from "vitest";
import { parseCards, parseChecklist, parseFlow, parseQuiz, parseStats } from "./blocks";

describe("lesson block parsers", () => {
  it("parses flow steps", () => {
    expect(parseFlow("Plan | Scope\nBuild | Deliver")).toEqual([{ title: "Plan", text: "Scope" }, { title: "Build", text: "Deliver" }]);
  });
  it("parses cards with icon and keeps extra pipes in text", () => {
    expect(parseCards("shield | Security | a | b")[0]).toEqual({ icon: "shield", title: "Security", text: "a | b" });
  });
  it("parses stats and checklist", () => {
    expect(parseStats("35% | ROI")).toEqual([{ value: "35%", label: "ROI" }]);
    expect(parseChecklist("- one\n* two\nthree")).toEqual(["one", "two", "three"]);
  });
  it("accepts a valid quiz", () => {
    const q = parseQuiz("? Q\n- a\n+ b\n= why");
    expect(q?.options[1].correct).toBe(true);
    expect(q?.explain).toBe("why");
  });
  it("rejects quizzes without exactly one correct answer", () => {
    expect(parseQuiz("? Q\n- a\n- b")).toBeNull();
    expect(parseQuiz("? Q\n+ a\n+ b")).toBeNull();
  });
});

import { extractJournal, splitSteps } from "./blocks";

describe("lesson steps", () => {
  it("splits on level-two headings and ignores headings inside code fences", () => {
    const steps = splitSteps("Intro\n\n## One\nbody\n```tip\n## not a heading\n```\n## Two\nmore");
    expect(steps.map((s) => s.title)).toEqual(["", "One", "Two"]);
    expect(steps[1].body).toContain("## not a heading");
  });
  it("extracts a journal prompt", () => {
    const { prompt, rest } = extractJournal("Text\n```journal\nWrite here\n```");
    expect(prompt).toBe("Write here");
    expect(rest).toBe("Text");
  });
});
