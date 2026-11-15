# PMForge AI Security Design

Scope: the mentor chat and artifact review features (`backend/app/ai.py`, `backend/app/routes/mentor.py`).
Status: implemented and covered by `backend/tests/test_ai_security.py`.

> Framework identifiers below are from the OWASP Top 10 for LLM Applications (2025 edition), NIST AI RMF 1.0 with the Generative AI Profile (NIST AI 600-1) and CIS Controls v8. Verify them against the current publications before quoting them in an audit.

## 1. Overview

Learners write text. We send it to an OpenAI model with fixed instructions and show the reply. The model gets no tools, no browsing, no memory and no access to our data.

## 2. Architecture

```
Browser (signed in) -> /api/v1/* (JWT verified) -> ownership + daily caps + monthly budget
   -> redact secrets and personal data -> neutralise brackets, random delimiters
   -> moderation (fail closed) -> model (store=false, no tools, strict JSON schema for reviews)
   -> leak canary check -> sanitise output (no HTML, links, images) -> schema validation -> response
```

## 3. Controls mapped to frameworks

| Risk | OWASP LLM | NIST AI RMF function | CIS v8 | Control in code |
| --- | --- | --- | --- | --- |
| Prompt injection | LLM01 | Manage | 16 | Per-request random delimiters, brackets neutralised, rules state tagged text is data, strict schema, injection attempts logged (hashed user id, no content) |
| Sensitive data disclosure | LLM02 | Map, Manage | 3 | `redact()` removes keys, tokens, emails, cards (Luhn), phones before the call; `store=false`; hashed `safety_identifier`; UI warns learners; learner is told what was removed |
| Supply chain | LLM03 | Govern | 2, 15 | Pinned dependencies, model names in config, API key only in environment variables |
| Improper output handling | LLM05 | Manage | 16 | `sanitize_output()` strips HTML, links, images, control characters; hard length caps; React renders as text; pydantic validation |
| Excessive agency | LLM06 | Manage | 6 | No tools passed to the model (asserted in tests); the model cannot act on any system |
| System prompt leakage | LLM07 | Manage | 3 | Nothing secret in prompts; per-request canary blocks replies that echo instructions |
| Misinformation | LLM09 | Measure | 16 | Prompt requires stating uncertainty and forbids invented sources; UI labels AI output as fallible |
| Unbounded consumption | LLM10 | Manage | 13 | Input and output caps, 45 s timeout, one retry, per-user daily caps, monthly budget |
| Abuse and harmful content | LLM01, LLM02 | Manage | 8 | Provider moderation on every input, fail closed |
| Accountability and audit | all | Govern | 8 | Usage log per user, cost recorded, no prompts or outputs in logs |

Not applicable today: LLM04 (we do not train), LLM08 (no vector store). Revisit if retrieval is added.

## 4. APIs

- `POST /api/v1/artifacts/{id}/review` returns `{score, strengths, gaps, next_steps, redacted}`. 422 `content_not_allowed` when moderation blocks.
- `POST /api/v1/mentor/chat` returns `{reply, redacted}`. Same 422 rule.
- 429 `daily_limit_reached` or `monthly_budget_reached`; 502 on upstream or validation failure (generic message).

## 5. Risks that remain

- Redaction is pattern based and will miss some data. Mitigation: learner warning, no storage at the provider.
- Moderation and the model can still be fooled by clever text. Mitigation: no tools, no secrets in context, output sanitised, so the worst case is a poor or odd answer.
- Model names in config are unverified until you enable the key. Check them in the OpenAI documentation.
- Provider outage disables the feature (fails closed by design).

## 6. Dependencies

OpenAI API (Responses and Moderations endpoints), `openai` Python SDK (pinned), Neon Postgres for usage logs.

## 7. Deployment steps

1. In the OpenAI dashboard create a project, a project-scoped API key and a hard monthly spending limit.
2. Add `OPENAI_API_KEY` as a Sensitive environment variable in Vercel. Never use a `NEXT_PUBLIC_` name.
3. Confirm `MODEL_REVIEW`, `MODEL_CHAT` and `MODEL_MODERATION` against the OpenAI model list, then redeploy.
4. Keep `AI_MODERATION=true`.
5. Rotate the key every 90 days or on any exposure.

## 8. Testing strategy

Automated: redaction, delimiters, moderation fail closed, schema, canary, sanitising, no tools, caps and budget (`tests/test_ai_security.py`, `tests/test_api.py`).
Manual before launch: run a prompt injection set (role override, instruction leak, link and image injection, data exfiltration attempts) and record results. Repeat after any prompt or model change.

## 9. Monitoring strategy

Alert on: spikes in 429 or 502, moderation blocks per user, "possible prompt injection" and "prompt leakage" log lines, daily cost against budget. Review weekly during beta.
