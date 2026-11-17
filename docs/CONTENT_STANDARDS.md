# PMForge Content Standards (permanent)

These requirements apply to every lesson, every day, without being repeated in a prompt.

1. **Real-world scenarios.** Open with a realistic project moment. Use examples and use cases an IT project manager recognises from working life. Show how AI now touches every part of professional and personal work. Every lesson has an AI scenario and an `ai` block.
2. **Visual teaching.** Use infographics, icons, process flows, frameworks and layered architecture diagrams. Align them with the reference frameworks in the PRD. Prefer a diagram or table to a paragraph. Key cards state "what goes wrong" so learners can recall it in interviews.
3. **Stay in IT project management.** Follow the curriculum in `curriculum.json`. Do not drift into general software engineering, data science or unrelated topics. AI appears as a project, governance and delivery topic.
4. **AI security.** Any OpenAI instructions or code follow NIST, CIS and OWASP. See `docs/AI_SECURITY.md`. No exceptions.

5. **Storytelling standard.** Lessons are lived, not explained. The reader is the project manager on a live, connected case (Project Lighthouse, fictional, Days 1 to 10), told in second person. Rules: (a) hook in the first screen with a `chat` scene or a dated moment, no definitions first; (b) concepts are explained through what happens next in the project, then named; (c) at least one `decision` block per lesson where each option shows its consequence and a senior PM take; (d) use a `timeline` to show how a problem builds over weeks and a `rag` block for project health; (e) named characters with roles, consistent across days; (f) each lesson ends with a link to tomorrow; (g) at least 700 words and a visible AI scenario. Real cases (for example Healthcare.gov) are framed as "you are the advisor", caveated, with no invented dates, figures or quotes.

6. **Framework references.** Every lesson has at least one `ref` card on the screens where it helps, pointing to PMI (PMBOK Guide, Agile Practice Guide), ITIL 4, NIST (CSF 2.0, AI RMF, SP 800 series), CIS Controls v8, OWASP, ISO/IEC and similar sources, with a note on how to use it at work or in an interview. Names and topics only: no links, no quotes, no clause numbers or figures unless certain, and sources must be on the allowed list in `test_lesson_blocks.py`. The card footer tells readers to check the current edition.

7. **Modern team lens.** Lessons reflect how AI enabled and digital transformation projects are staffed today: forward deployed engineers (embedded with the customer to deploy, integrate and tune), AI security consultants (prompt injection, data leakage, supply chain; OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS), agentic AI engineers (LLMs that plan and call tools), agent harness engineers (tools, memory, guardrails, evaluations and logging around an agent), Harness CI/CD platform engineers (the vendor platform, a different role from the agent harness), AI engineers (retrieval, prompts, evaluations) and traditional developers. Always say that agent harness engineering is not a standardised term, and tell learners to confirm the scope in their own organisation. Each lesson in the kit has a role lens (`cards` with a what goes wrong column), an `incident`, an `answer`, a `mindmap` and `flashcards`. All 120 days except the buffer days (29, 59, 89 and 119) carry the kit. The free days are the hook for paid users, so they come first in every wave. New lessons must include the kit.
8. **Incidents are illustrative.** An `incident` is a composite scenario labelled `(illustrative)`: no real client names, no invented statistics, quotes or dates. A real public case needs a verified source and a caveat to check the current record.

Also: plain English, no em dashes, no invented statistics or quotes, mark illustrative scenarios as illustrative, verify figures for real cases, and never use real client names.

## Lesson format

One `## ` heading is one screen (6 to 12 screens). Blocks are fenced code blocks.

| Block | Lines | Notes |
| --- | --- | --- |
| `quote` | `message \| who` | workplace scenario messages |
| `flow` | `Step \| detail` | numbered process |
| `cards` | `icon \| Title \| text \| what goes wrong` | last field optional; icons: target users shield server cloud database code git alert check clock money layers lock workflow chart rocket search file link settings brain zap flag eye book map spark |
| `arch` | `# Title`, `Layer \| item, item`, `~Cross-cutting \| item, item` | layered architecture diagram |
| `stats` | `value \| label` | big numbers |
| `checklist` | one item per line | interactive |
| `quiz` | `? question`, `- wrong`, `+ right`, `= why` | exactly one right answer |
| `accordion` | `Title \| text` | expandable |
| `chat` | `# Where and when`, then `Name \| role \| message` | story scene, avatars are generated |
| `timeline` | `When \| What happened \| ok/warn/bad/info` | how events unfold |
| `rag` | `Area \| R or A or G \| note` | project health tiles |
| `decision` | `? situation`, `- option \| result`, `+ best option \| result`, `= senior PM take` | exactly one `+`; every option states its consequence |
| `tip` `note` `warn` `key` | free text | callouts |
| `ai` | `Shift`, `Example (illustrative)`, `Use AI to`, `Keep human`, `Risk`, `Control`, `Interview line` rows | structured AI lens, one per lesson, 100+ words; enforced by test |
| `journal` | prompt text | learner writes, optional AI feedback |
| `ref` | `Source \| where to look \| how to use it` | framework reference and interview prep; 3 fields per line |
| `mindmap` | `# Centre`, then `Branch \| child, child` | 3 or more branches, each with 2 or more children |
| `flashcards` | `Front \| Back` | 3 or more cards; tap to flip, review again or got it |
| `incident` | `# Title (illustrative)`, then `What happened`, `Impact`, `Root cause`, `Resolution`, `PM move` rows | real world scenario with resolution |
| `answer` | `? question`, `- weak answer \| why it fails`, `+ strong answer`, `= tailoring tip` | interview answer; tips repeat; the learner replaces the example with their own real story |

Tables use normal Markdown. Tests in `backend/tests/test_lesson_blocks.py` enforce the format.
