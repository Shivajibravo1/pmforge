import { describe, expect, it } from "vitest";
import { parseArch, parseChat, parseDecision, parseRag, parseTimeline, readMinutes, parseCards, parseChecklist, parseFlow, parseQuiz, parseRef, parseStats, parseMindmap, parseFlashcards, parseIncident, parseAnswer, parseComm, parseDiagram, layoutDiagram, parseLens } from "./blocks";

describe("lesson block parsers", () => {
  it("parses flow steps", () => {
    expect(parseFlow("Plan | Scope\nBuild | Deliver")).toEqual([{ title: "Plan", text: "Scope" }, { title: "Build", text: "Deliver" }]);
  });
  it("parses reference rows, keeping extra pipes in the last field", () => {
    expect(parseRef("NIST | CSF 2.0, Govern | Say it | twice")).toEqual([{ framework: "NIST", where: "CSF 2.0, Govern", use: "Say it | twice" }]);
    expect(parseRef("PMI | PMBOK Guide")[0].use).toBe("");
  });
  it("parses mind maps, flashcards, incidents and interview answers", () => {
    expect(parseMindmap("# Agentic AI\nRoles | FDE, Harness engineer\nRisks | Excessive agency")).toEqual({
      centre: "Agentic AI", branches: [{ name: "Roles", children: ["FDE", "Harness engineer"] }, { name: "Risks", children: ["Excessive agency"] }] });
    expect(parseFlashcards("What is an FDE? | Engineer embedded with the customer")).toEqual([{ front: "What is an FDE?", back: "Engineer embedded with the customer" }]);
    const inc = parseIncident("# Agent deleted data (illustrative)\nWhat happened | It ran a delete\nImpact | Outage\nRoot cause | Too much access\nResolution | Restore");
    expect(inc.title).toContain("illustrative");
    expect(inc.rows.map((r) => r.tone)).toEqual(["info", "bad", "warn", "ok"]);
    const a = parseAnswer("? How do you govern an agent?\n- I trust it | no controls\n+ Least privilege and human approval.\n= For FDE roles, mention the customer site.");
    expect(a?.weak[0]).toEqual({ text: "I trust it", why: "no controls" });
    expect(a?.strong).toContain("Least privilege");
    expect(a?.tips).toHaveLength(1);
    expect(parseAnswer("? only a question")).toBeNull();
  });
  it("parses a communication exercise and separates the model answer", () => {
    const c = parseComm("# Tell the sponsor\nAudience | Sponsor\nSituation | Slip\nTask | Write 3 lines\nGood looks like | Plain and specific");
    expect(c.title).toBe("Tell the sponsor");
    expect(c.rows.map((r) => r.label)).toEqual(["Audience", "Situation", "Task"]);
    expect(c.good).toBe("Plain and specific");
  });
  it("lays out a process diagram and routes edges between nodes", () => {
    const d = parseDiagram("# Flow\nzone Users\nnode u | users | Customer | Browser\nzone App\nnode a | server | Portal\nnode b | database | Orders\nedge u > a | HTTPS\nedge a > b\nedge a > nowhere");
    expect(d.zones).toEqual(["Users", "App"]);
    expect(d.edges).toHaveLength(2);
    const l = layoutDiagram(d);
    expect(l.routes[0].path.startsWith("M ")).toBe(true);
    expect(l.routes[0].label).toBe("HTTPS");
    expect(l.routes[1].path).toContain("L");
    expect(l.width).toBe(580);
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

describe("parseLens", () => {
  it("parses structured rows and rejects the old free text form", () => {
    const rows = parseLens("Shift | AI changes this\nUse AI to | draft\nKeep human | decide\nRisk | leakage");
    expect(rows?.map((r) => r.label)).toEqual(["Shift", "Use AI to", "Keep human", "Risk"]);
    expect(parseLens("Just two lines of advice about AI.")).toBeNull();
  });
});
