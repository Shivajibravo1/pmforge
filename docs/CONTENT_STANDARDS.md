# PMForge Content Standards (permanent)

These requirements apply to every lesson, every day, without being repeated in a prompt.

1. **Real-world scenarios.** Open with a realistic project moment. Use examples and use cases an IT project manager recognises from working life. Show how AI now touches every part of professional and personal work. Every lesson has an AI scenario and an `ai` block.
2. **Visual teaching.** Use infographics, icons, process flows, frameworks and layered architecture diagrams. Align them with the reference frameworks in the PRD. Prefer a diagram or table to a paragraph. Key cards state "what goes wrong" so learners can recall it in interviews.
3. **Stay in IT project management.** Follow the curriculum in `curriculum.json`. Do not drift into general software engineering, data science or unrelated topics. AI appears as a project, governance and delivery topic.
4. **AI security.** Any OpenAI instructions or code follow NIST, CIS and OWASP. See `docs/AI_SECURITY.md`. No exceptions.

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
| `tip` `note` `warn` `key` `ai` | free text | callouts; `ai` is the AI lens |
| `journal` | prompt text | learner writes, optional AI feedback |

Tables use normal Markdown. Tests in `backend/tests/test_lesson_blocks.py` enforce the format.
