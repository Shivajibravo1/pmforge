# Payments (SuperProfile + n8n) and Meta Pixel: setup guide

## Overview
Members pay on SuperProfile. SuperProfile has no webhook, but it emails the seller a "Someone purchased your product!"
message for every sale (product title, amount, buyer email, transaction ID). n8n, running on the same VPS, reads
that email, checks it really came from SuperProfile, and posts the order to PMForge with an HMAC signature.
PMForge then unlocks the buyer.

## Architecture
```
Buyer -> SuperProfile checkout -> sale email -> Gmail inbox (bravoshivaji@gmail.com)
      -> n8n (IMAP trigger, Code node: verify + parse + sign)
      -> http://backend:8000/public/payments/superprofile   (Docker network only; Caddy returns 404 from the internet)
      -> tier = paid, paid_until = today + 30 or 365 days
```

## Workflow (what each status means)
| Status | When | What you do |
|---|---|---|
| `applied` | Plan title matches, amount at or above the plan price, account with that email exists | Nothing |
| `pending` | Same, but no account with that email yet | Nothing: it unlocks when that email signs in |
| `review` | Amount below plan price (coupon) or a non-INR currency | Check it, then set the user to Paid in Admin |
| `ignored` | Any other SuperProfile product | Nothing |
| `duplicate` | Same transaction ID sent again | Nothing |

Admin list: `GET /api/v1/admin/payments` (admin only).

## APIs
`POST /public/payments/superprofile`
- Headers: `X-PMForge-Timestamp` (Unix seconds), `X-PMForge-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>." + raw body>`
- Body: `{"transaction_id","buyer_email","product_title","amount","currency"}`
- Refused: missing secret (503), bad or old signature, older than 5 minutes (401), bad body (422)

## Security considerations
- The endpoint is not reachable from the internet (Caddy 404). Only n8n on the internal network can call it.
- Every request is signed with `PAYMENT_WEBHOOK_SECRET`, time-limited (replay protection) and idempotent.
- n8n accepts only emails from `hello@superprofile.bio` that Gmail marked `dmarc=pass` for `superprofile.bio`.
  A spoofed "sale" email fails this check and is skipped.
- Amount must be at least the plan price, or the payment goes to `review`.
- The n8n editor is at `https://n8n.pmforge.pm` behind n8n's own owner login. Use a long unique password.
- The Gmail app password lives only in the n8n credential store (encrypted with `N8N_ENCRYPTION_KEY`).

## Risks
| Risk | Mitigation |
|---|---|
| SuperProfile changes its sale email wording | Parse failures are listed in n8n executions as `parse_failed`; buyer email still reaches you, upgrade by hand in Admin |
| Buyer pays with a different email | Payment stays `pending`; set them to Paid by hand. The upgrade screen tells buyers to use the same email |
| No auto-renewal | Plan ends after 30/365 days; the You page shows the end date and a Renew button |
| n8n down | Sales queue in Gmail; n8n picks unread emails up when it restarts |

## Dependencies
Gmail app password for `bravoshivaji@gmail.com` (needs 2-Step Verification on), Cloudflare DNS for `n8n.pmforge.pm`,
two SuperProfile payment pages, Meta Pixel ID `958344247157036`.

## Deployment steps
1. **SuperProfile pages.** Create two payment pages. Copy each page's public link and its exact title.
2. **Secrets.** On your computer run `openssl rand -hex 32` twice: one value for `PAYMENT_WEBHOOK_SECRET`, one for
   `N8N_ENCRYPTION_KEY`. Do not paste them in chat.
3. **hPanel > VPS > Docker Manager > PMForge project > Environment.** Add:

   | Variable | Value |
   |---|---|
   | `PAYMENT_WEBHOOK_SECRET` | first hex value |
   | `N8N_ENCRYPTION_KEY` | second hex value (never change it later) |
   | `SUPERPROFILE_MONTHLY_TITLE` | exact title of the monthly page |
   | `SUPERPROFILE_YEARLY_TITLE` | exact title of the yearly page |
   | `SUPERPROFILE_MONTHLY_URL` | public link of the monthly page (`https://superprofile.bio/...`) |
   | `SUPERPROFILE_YEARLY_URL` | public link of the yearly page |
   | `META_PIXEL_ID` | `958344247157036` |

4. **Cloudflare DNS.** Add `A n8n -> 189.72.156.9`, Proxied (orange cloud).
5. **Redeploy** the project in Docker Manager (pull latest images). The `backend-migrate` job adds the payments table.
6. **Gmail app password.** Google Account > Security > 2-Step Verification > App passwords > create one named "n8n".
7. **n8n first login.** Open `https://n8n.pmforge.pm`, create the owner account.
8. **Build the workflow** (Workflows > New):
   1. Node **Email Trigger (IMAP)**. Credential: host `imap.gmail.com`, port `993`, SSL on, user
      `bravoshivaji@gmail.com`, password = app password. Mailbox `INBOX`. Action: mark as read. Format: **Resolved**.
      Custom email rules: `["UNSEEN", ["FROM", "hello@superprofile.bio"], ["SUBJECT", "Someone purchased your product"]]`.
   2. Node **Code** (Run once for all items, JavaScript), paste the script below.
   3. Node **IF**: condition `{{ $json.sig }}` is not empty.
   4. On the true branch, node **HTTP Request**: Method `POST`, URL `http://backend:8000/public/payments/superprofile`,
      Send Headers on: `X-PMForge-Timestamp` = `{{ $json.ts }}`, `X-PMForge-Signature` = `{{ $json.sig }}`,
      `Content-Type` = `application/json`. Send Body on, Body Content Type **Raw**, content type
      `application/json`, Body `{{ $json.body }}`. Retry on fail: 3 tries, 10 s wait.
   5. Activate the workflow.

```javascript
// PMForge payment bridge. Verifies, parses and signs SuperProfile sale emails.
const crypto = require('crypto');
const SECRET = $env.PMFORGE_PAYMENT_SECRET;
if (!SECRET) throw new Error('PMFORGE_PAYMENT_SECRET is not set');
const out = [];
for (const item of $input.all()) {
  const m = item.json;
  const subject = String(m.subject ?? '');
  const from = JSON.stringify(m.from ?? '').toLowerCase();
  const headers = JSON.stringify(m.headers ?? {}).toLowerCase();
  if (!from.includes('hello@superprofile.bio') || !subject.startsWith('Someone purchased your product')) continue;
  // Gmail's own verdict. A forged sender fails DMARC for superprofile.bio.
  if (!headers.includes('dmarc=pass') || !headers.includes('header.from=superprofile.bio')) {
    out.push({ json: { skipped: 'authentication_failed', subject } });
    continue;
  }
  const text = String(m.textPlain ?? m.text ?? '').replace(/\s+/g, ' ');
  const title = (text.match(/Product title:\s*(.+?)\s*\|\s*Quantity/i) || [])[1];
  const email = (text.match(/Email\s*-\s*(\S+@\S+)/i) || [])[1];
  const amount = (text.match(/Amount paid by customer\s*([\d.,]+)/i) || [])[1];
  const txn = (text.match(/Transaction ID:\s*([A-Za-z0-9_-]+)/i) || [])[1];
  if (!title || !email || !amount || !txn) {
    out.push({ json: { skipped: 'parse_failed', subject } });
    continue;
  }
  const body = JSON.stringify({ transaction_id: txn, buyer_email: email, product_title: title,
                                amount: Number(amount.replace(/,/g, '')), currency: 'INR' });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(ts + '.' + body).digest('hex');
  out.push({ json: { body, ts, sig } });
}
return out;
```

## Testing strategy
1. Unit tests: `backend/tests/test_payments.py` (signature, replay, idempotency, plan mapping, expiry, claims) and
   `frontend/src/lib/*.test.ts` (pixel consent, checkout link allow-list).
2. Live check: create a temporary SuperProfile page priced ₹1 with any other title. Buy it yourself.
   In n8n > Executions the run should end with HTTP 200 and `{"status":"ignored"}`.
   If the Code node shows `authentication_failed`, open the execution, look at `headers`, and send me the
   `authentication-results` line (no other data) so I can adjust the check. Delete the test page afterwards.
3. Full check: buy the monthly plan once with your own learner email; Day 8 should open within a few minutes.
   Refund it in SuperProfile afterwards if you wish.
4. Pixel: install the Meta Pixel Helper browser extension, open `https://pmforge.pm`, click Allow on the banner,
   sign up with a test email. Events Manager > Test events should show `PageView` and `CompleteRegistration`.

## Monitoring strategy
- n8n > Executions: failures and `parse_failed` / `authentication_failed` runs.
- Admin payments list: anything in `review` or `pending` for more than a day.
- Backend logs: `pmforge.payments` lines (`recorded`, `needs review`).
- Meta Events Manager: event volume for `CompleteRegistration` and `InitiateCheckout`.
