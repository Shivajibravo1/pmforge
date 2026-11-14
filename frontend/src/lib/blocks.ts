/** Pure parsers for the rich lesson blocks. A block is a fenced code block whose language names the block. */

export type BlockKind = "quote" | "flow" | "cards" | "stats" | "checklist" | "quiz" | "accordion" | "tip" | "note" | "warn" | "key";
export const BLOCK_KINDS: BlockKind[] = ["quote", "flow", "cards", "stats", "checklist", "quiz", "accordion", "tip", "note", "warn", "key"];

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const cells = (l: string) => l.split("|").map((c) => c.trim());

export function parseFlow(src: string) {
  return lines(src).map((l) => {
    const [title, ...rest] = cells(l);
    return { title, text: rest.join(" | ") };
  });
}

export function parseCards(src: string) {
  return lines(src).map((l) => {
    const [icon, title, ...rest] = cells(l);
    return { icon, title, text: rest.join(" | ") };
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
