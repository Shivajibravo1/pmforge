import { describe, expect, it } from "vitest";
import { parseArch, parseChat, parseDecision, parseRag, parseTimeline, readMinutes, parseCards, parseChecklist, parseFlow, parseQuiz, parseStats } from "./blocks";

describe("lesson block parsers", () => {
  it("parses flow steps", () => {
    expect(parseFlow("Plan | Scope\nBuild | Deliver")).toEqual([{ title: "Plan", text: "Scope" }, { title: "Build", text: "Deliver" }]);
  });
  it("parses cards with icon, text and an optional risk", () => {
    expect(parseCards("shield | Security | a | b")[0]).toEqual({ icon: "shield", title: "Security", text: "a", risk: "b" });
    expect(parseCards("code | App | only text")[0].risk).toBe("");
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

describe("architecture blocks", () => {
  it("parses a title, layers and a cross-cutting band", () => {
    const a = parseArch("# Portal\nExperience | Web, Mobile\n~Security | SSO, Logging");
    expect(a.title).toBe("Portal");
    expect(a.rows[0].items).toEqual(["Web", "Mobile"]);
    expect(a.rows[1].cross).toBe(true);
  });
});

describe("story blocks", () => {
  it("parses a chat scene", () => {
    const c = parseChat("# Slack, 9:47 AM\nSlack | Data lead | Model is flagging twice as many");
    expect(c.title).toBe("Slack, 9:47 AM");
    expect(c.messages[0]).toEqual({ name: "Slack", role: "Data lead", text: "Model is flagging twice as many" });
  });
  it("parses a timeline with tones and defaults unknown tones to info", () => {
    const t = parseTimeline("Week 1 | Kickoff | ok\nWeek 2 | Slip | bad\nWeek 3 | Note | odd");
    expect(t.map((x) => x.tone)).toEqual(["ok", "bad", "info"]);
  });
  it("parses RAG tiles", () => {
    expect(parseRag("Schedule | amber | two weeks behind")[0]).toEqual({ area: "Schedule", code: "A", note: "two weeks behind" });
  });
  it("parses a decision and rejects one without exactly one best option", () => {
    expect(parseDecision("? S\n- a | ra\n+ b | rb\n= take")?.options[1].best).toBe(true);
    expect(parseDecision("? S\n- a | ra\n- b | rb")).toBeNull();
    expect(parseDecision("? S\n- a\n+ b | rb")).toBeNull();
  });
  it("estimates reading time", () => {
    expect(readMinutes("word ".repeat(360))).toBe(2);
    expect(readMinutes("")).toBe(1);
  });
});
