/** Pure parsers for the rich lesson blocks. A block is a fenced code block whose language names the block. */

export type BlockKind = "chat" | "decision" | "timeline" | "rag" | "arch" | "ai" | "quote" | "flow" | "cards" | "stats" | "checklist" | "quiz" | "accordion" | "tip" | "note" | "warn" | "key" | "ref" | "mindmap" | "flashcards" | "incident" | "answer" | "comm";
export const BLOCK_KINDS: BlockKind[] = ["chat", "decision", "timeline", "rag", "arch", "ai", "quote", "flow", "cards", "stats", "checklist", "quiz", "accordion", "tip", "note", "warn", "key", "ref", "mindmap", "flashcards", "incident", "answer", "comm"];

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const cells = (l: string) => l.split("|").map((c) => c.trim());

export function parseFlow(src: string) {
  return lines(src).map((l) => {
    const [title, ...rest] = cells(l);
    return { title, text: rest.join(" | ") };
  });
}

/** `icon | Title | text | what goes wrong` (the last field is optional). */
export function parseCards(src: string) {
  return lines(src).map((l) => {
    const [icon, title, text = "", ...risk] = cells(l);
    return { icon, title, text, risk: risk.join(" | ") };
  });
}

export function parseStats(src: string) {
  return lines(src).map((l) => {
    const [value, ...rest] = cells(l);
    return { value, label: rest.join(" | ") };
  });
}

export function parseChecklist(src: string) {
  return lines(src).map((l) => l.replace(/^[-*]\s*/, ""));
}

export function parseAccordion(src: string) {
  return lines(src).map((l) => {
    const [title, ...rest] = cells(l);
    return { title, text: rest.join(" | ") };
  });
}

/** Reference card. Each line is `Framework | Where to look | How to use it at work or in an interview`. */
export function parseRef(src: string) {
  return lines(src).map((l) => {
    const [framework, where = "", ...rest] = cells(l);
    return { framework, where, use: rest.join(" | ") };
  });
}

/** Mind map. First line `# Centre`, then `Branch | child, child, child`. */
export function parseMindmap(src: string) {
  const ls = lines(src);
  const centre = ls[0]?.startsWith("#") ? ls.shift()!.replace(/^#\s*/, "") : "";
  const branches = ls.map((l) => {
    const [name, ...rest] = cells(l);
    return { name, children: rest.join(" | ").split(",").map((x) => x.trim()).filter(Boolean) };
  });
  return { centre, branches };
}

/** Flashcards. Each line is `Front | Back`. */
export function parseFlashcards(src: string) {
  return lines(src).map((l) => {
    const [front, ...rest] = cells(l);
    return { front, back: rest.join(" | ") };
  });
}

export type IncidentTone = "info" | "bad" | "warn" | "ok";

/** Incident write-up. First line `# Title (illustrative)`, then `Label | text` rows such as What happened, Impact, Root cause, Resolution, PM move. */
export function parseIncident(src: string) {
  const ls = lines(src);
  const title = ls[0]?.startsWith("#") ? ls.shift()!.replace(/^#\s*/, "") : "";
  const rows = ls.map((l) => {
    const [label, ...rest] = cells(l);
    const k = label.toLowerCase();
    const tone: IncidentTone = k.startsWith("impact") ? "bad" : k.startsWith("root") || k.startsWith("signal") ? "warn" : k.startsWith("resol") || k.startsWith("pm") || k.startsWith("lesson") ? "ok" : "info";
    return { label, text: rest.join(" | "), tone };
  });
  return { title, rows };
}

/** Communication exercise. First line `# Title`, then `Audience`, `Situation`, `Task`, `Good looks like` rows. */
export function parseComm(src: string) {
  const ls = lines(src);
  const title = ls[0]?.startsWith("#") ? ls.shift()!.replace(/^#\s*/, "") : "";
  const rows = ls.map((l) => { const [label, ...rest] = cells(l); return { label, text: rest.join(" | ") }; });
  const good = rows.find((r) => r.label.toLowerCase().startsWith("good"));
  return { title, rows: rows.filter((r) => r !== good), good: good?.text ?? "" };
}

export type LensRow = { label: string; text: string };

/** Structured AI lens. `Label | text` rows (Shift, Use AI to, Keep human, Risk, Control, Interview line). Returns null for the old free text form. */
export function parseLens(src: string): LensRow[] | null {
  const rows = lines(src).filter((l) => l.includes("|")).map((l) => {
    const [label, ...rest] = cells(l);
    return { label, text: rest.join(" | ") };
  }).filter((r) => r.label && r.text);
  return rows.length >= 3 ? rows : null;
}

export type Answer = { question: string; weak: { text: string; why: string }[]; strong: string; tips: string[] };

/** Interview answer. `? question`, `- weak answer | why it loses marks`, `+ strong answer`, `= tailoring tip` (repeatable). Needs a question and a strong answer. */
export function parseAnswer(src: string): Answer | null {
  const ls = lines(src);
  const question = ls.find((l) => l.startsWith("?"))?.slice(1).trim();
  const strong = ls.find((l) => l.startsWith("+"))?.slice(1).trim();
  if (!question || !strong) return null;
  const weak = ls.filter((l) => l.startsWith("-")).map((l) => {
    const [text, ...rest] = cells(l.slice(1));
    return { text, why: rest.join(" | ") };
  });
  const tips = ls.filter((l) => l.startsWith("=")).map((l) => l.slice(1).trim());
  return { question, weak, strong, tips };
}

export type Quiz = { question: string; options: { text: string; correct: boolean }[]; explain: string };

/** "? question", "- wrong option", "+ right option", "= explanation". Exactly one right option is required. */
export function parseQuiz(src: string): Quiz | null {
  const ls = lines(src);
  const question = ls.find((l) => l.startsWith("?"))?.slice(1).trim();
  const options = ls.filter((l) => l.startsWith("-") || l.startsWith("+")).map((l) => ({ text: l.slice(1).trim(), correct: l.startsWith("+") }));
  const explain = ls.find((l) => l.startsWith("="))?.slice(1).trim() ?? "";
  if (!question || options.length < 2 || options.filter((o) => o.correct).length !== 1) return null;
  return { question, options, explain };
}

/** Each message line is `text | who`. Used for realistic workplace scenarios. */
export function parseQuote(src: string) {
  return lines(src).map((l) => {
    const [text, ...rest] = cells(l);
    return { text: text.replace(/^"|"$/g, ""), who: rest.join(" | ") };
  });
}

export type Step = { title: string; body: string };

/** Splits a lesson into screens: every `## ` heading outside a code fence starts a new step. */
export function splitSteps(body: string): Step[] {
  const steps: Step[] = [];
  let cur: Step | null = null;
  let fenced = false;
  const intro: string[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    if (!fenced && line.startsWith("## ")) {
      cur = { title: line.slice(3).trim(), body: "" };
      steps.push(cur);
    } else if (cur) cur.body += line + "\n";
    else intro.push(line);
  }
  const lead = intro.join("\n").trim();
  if (lead) steps.unshift({ title: "", body: lead });
  return steps.map((s) => ({ ...s, body: s.body.trim() }));
}

/** Pulls a ```journal block out of a step: returns the prompt and the remaining text. */
export function extractJournal(body: string): { prompt: string | null; rest: string } {
  const m = /```journal\n([\s\S]*?)```/.exec(body);
  if (!m) return { prompt: null, rest: body };
  return { prompt: m[1].trim(), rest: body.replace(m[0], "").trim() };
}

/**
 * Layered architecture diagram. Optional first line `# Title`. Each row is `Layer | item, item, item`.
 * A layer name starting with `~` is a cross-cutting band (for example security) drawn across all layers.
 */
export function parseArch(src: string) {
  const ls = lines(src);
  const title = ls[0]?.startsWith("#") ? ls.shift()!.replace(/^#\s*/, "") : "";
  const rows = ls.map((l) => {
    const [name, ...rest] = cells(l);
    return { name: name.replace(/^~/, ""), cross: name.startsWith("~"), items: rest.join(" | ").split(",").map((x) => x.trim()).filter(Boolean) };
  });
  return { title, rows };
}

/** Chat scene. Optional first line `# Where and when`. Each message is `Name | role | message`. */
export function parseChat(src: string) {
  const ls = lines(src);
  const title = ls[0]?.startsWith("#") ? ls.shift()!.replace(/^#\s*/, "") : "";
  return { title, messages: ls.map((l) => { const [name, role = "", ...rest] = cells(l); return { name, role, text: rest.join(" | ") }; }) };
}

export type Tone = "ok" | "warn" | "bad" | "info";
const TONES: Tone[] = ["ok", "warn", "bad", "info"];

/** Timeline. Each event is `When | What happened | tone` (tone optional: ok, warn, bad, info). */
export function parseTimeline(src: string) {
  return lines(src).map((l) => {
    const [when, text = "", tone = "info"] = cells(l);
    return { when, text, tone: (TONES.includes(tone as Tone) ? tone : "info") as Tone };
  });
}

/** RAG status tiles. Each tile is `Area | R or A or G | note`. */
export function parseRag(src: string) {
  return lines(src).map((l) => {
    const [area, status = "G", ...rest] = cells(l);
    const code = status.toUpperCase().startsWith("R") ? "R" : status.toUpperCase().startsWith("A") ? "A" : "G";
    return { area, code: code as "R" | "A" | "G", note: rest.join(" | ") };
  });
}

export type Decision = { situation: string; options: { text: string; result: string; best: boolean }[]; take: string };

/** `? situation`, `- option | what happens`, `+ best option | what happens`, `= senior PM take`. Exactly one best option. */
export function parseDecision(src: string): Decision | null {
  const ls = lines(src);
  const situation = ls.find((l) => l.startsWith("?"))?.slice(1).trim();
  const options = ls.filter((l) => l.startsWith("-") || l.startsWith("+")).map((l) => {
    const [text, ...rest] = cells(l.slice(1));
    return { text, result: rest.join(" | "), best: l.startsWith("+") };
  });
  const take = ls.find((l) => l.startsWith("="))?.slice(1).trim() ?? "";
  if (!situation || options.length < 2 || options.filter((o) => o.best).length !== 1 || options.some((o) => !o.result)) return null;
  return { situation, options, take };
}

export const readMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 180));
