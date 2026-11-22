# PMForge roadmap: the one stop app for IT project managers

Decisions (22 Nov 2026): keep and enhance the existing 120 lessons and the case story, start with architecture
explainers, add four new modules, measure how members use the app before guessing why they leave.

## Wave 1 (done)

| Item | What it gives a member |
| --- | --- |
| Case renamed to Project Nimbus | A name that fits an IT delivery story (cloud portal with an AI assistant). Every lesson updated. |
| Architecture Library | 14 one page explainers in business language: what it is, analogy, layered diagram, what it does to your plan, what goes wrong, questions to ask engineers, an interview line. 5 free, the rest paid. |
| Usage measures | "Last seen" per member and "seen in last 7 days" on the admin page, next to lessons done and last lesson. |

## Wave 2: Communication toolkit
Ready to use status report, escalation email, bad news message, stakeholder update, meeting agenda and decision log, each
with a good and a weak example and a "what to change" note. Member pastes their own draft and gets AI feedback (same
security controls as the Mentor: redaction, moderation, strict output, caps).

## Wave 3: Interview mock practice (done)
Timed questions by role (Agile PM, Functional PM, AI PM): behavioural, scenario, and technical-in-business-language.
Member answers, gets a score against a rubric and a model answer. Builds on the existing `answer` blocks and daily email.

## Wave 4: PM templates and tools (done)
Eight fill-in templates (RAID log, risk register, charter, RACI, business case, test strategy, status report, stakeholder register) with a worked Nimbus example, tips and common mistakes. Drafts stay on the device; CSV download protects against spreadsheet formula injection. Three are free.

## Wave 5: Lesson enhancement (done)
Status: a new `comm` block (communication exercise) exists. Days 1 to 120 (except buffer days 29, 59, 89 and 119) carry one architecture
diagram and one communication exercise, enforced by `ENHANCED_DAYS` in `test_lesson_blocks.py`. Done: all 116 non buffer lessons.
Not done: the dedicated "tech in business language" screen and the per lesson link to a Library topic (the diagrams
and communication exercises are in; the Library links are still to do).

Original plan:
Add an architecture diagram and a "tech in business language" screen to every lesson that touches technology (only 11
have one today), link each lesson to its Library topic, and add one communication exercise per lesson. Order: free days
(1 to 10), then AI, cloud and security days.

## Retention
Read the last-seen and last-lesson data for two weeks before changing the lesson length. Then choose between shorter
daily paths, streak and reminder nudges (email and push already exist), or both.

## Rules for all new content
Plain English, no em dashes, no invented statistics, quotes or client names, illustrative scenarios labelled, framework
names only (no clause numbers). AI features follow `docs/AI_SECURITY.md`. Tests enforce what they can.
