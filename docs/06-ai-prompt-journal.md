# Stage 6b — AI Prompt Journal

**Purpose:** an honest record of how AI was used at each stage: the key prompts, what the AI produced, what I changed, and the **mistakes I caught**. The challenge requires **at least 3 documented AI mistakes**.

**Tools used:** _e.g. Claude (docs and design), GitHub Copilot (in-editor completion), ChatGPT (…)_. Keep this list accurate.

> ✍️ **How to use this file:** add an entry whenever an AI output shapes the product (a document, a design decision, a non-trivial piece of code or a test). Copy the template. Be specific: "changed X because Y" is evidence; "reviewed it" is not.

---

## Entry template

```markdown
### J-<nn> · <Stage> · <short title>
- **Date / tool:** 
- **Prompt (key part):** "…"
- **What the AI produced:** 
- **What I kept:** 
- **What I changed and why:** 
- **Verification:** (test ID, manual check, docs link)
- **AI mistake?** none / see M-<nn>
```

---

## Journal entries

### J-01 · Stages 1–8 · Initial documentation set
- **Date / tool:** _<date>_ · Claude
- **Prompt (key part):** "This is a challenge I have to do, and I chose Office Canteen Pre-order. Create all the required documents mentioned in this md file." (The challenge brief was attached.)
- **What the AI produced:** First drafts of every file in `docs/`: discovery (problem, 4 personas, 15 assumptions), MoSCoW requirements, 20 user stories with Given/When/Then criteria, ADR-001, architecture, ER diagram, API list and wireframes, build plan, test strategy, test cases, traceability matrix, bug-log template, k6 load-test plan, demo script and retro template.
- **What I kept:** _<fill in>_
- **What I changed and why:** _<fill in, for example: changed the cut-off from 11:00 to 10:30 after talking to the real canteen manager; removed persona X; re-weighted the ADR for my actual skills>_
- **Verification:** Read every story against the Must list; checked that each Must feature has a story; rendered the Mermaid diagrams on GitHub.
- **AI mistakes caught:** _<fill in; see the list of things to check below>_

### J-02 · Stage 5 · UI design generated with Stitch
- **Date / tool:** _<date>_ · Stitch (AI design tool)
- **Prompt (key part):** the design brief `05-ui-design-requirements.md` (screens, styles, sample data, accessibility rules).
- **What the AI produced:** the "Fresh Counter" design system (`docs/design/fresh_counter/DESIGN.md`) and 4 screens: S3 Today's menu, S4 Checkout + slots, S5 Order pass / QR, S10 Manager dashboard.
- **What I kept:** the visual system (colours, Plus Jakarta Sans + JetBrains Mono, FSSAI diet markers, card and ticket styles) and the layout of all 4 screens.
- **What I changed and why:** 21 details reviewed against the requirements; decisions D1–D21 in `02-requirements.md §6.1` (e.g. dropped the wallet button and the subsidy/tax rows, promoted slot capacity to Must, kept RBAC for settings).
- **Verification:** compared each screen with the stories' acceptance criteria and the RBAC matrix; visual comparison test TC-UI-16.
- **AI mistakes caught:** M-01, M-02, M-03 below.

### J-03 · Stage 4 · Tech stack re-evaluation
- **Date / tool:** _<date>_ · Claude
- **Prompt (key part):** "Give me a comparison of which tech stack we're using and why not others", then "If I want to go with Option B".
- **What the AI produced:** a layer-by-layer comparison, and the changes needed for Option B (cookie proxy, cold start, cron, Supertest).
- **What I kept / changed:** _<fill in>_. The v1 ADR had assumed equal skill for Next.js and Express; I corrected the scores to my real experience, which changed the decision (ADR-001 v2).
- **Verification:** _<e.g. tested login on a Vercel preview deployment>_

### J-04 · Stage 6 · _<e.g. Prisma schema>_
- **Date / tool:**
- **Prompt (key part):**
- **What the AI produced:**
- **What I kept:**
- **What I changed and why:**
- **Verification:**
- **AI mistake?**

### J-05 · Stage 6 · _<e.g. place-order service>_
- …

### J-06 · Stage 7 · _<e.g. Supertest API tests>_
- …

---

## AI mistakes caught (minimum 3)

| ID | Stage | What the AI produced | Why it was wrong / insecure / incomplete | How I found it | Fix | Evidence |
|---|---|---|---|---|---|---|
| M-01 | 5 (design) | Stitch S5 showed a **decorative QR** and named the dish "Veg **Dum** Biryani" while the menu and summary said "Veg Biryani" | Incomplete / inconsistent: a fake QR can't be scanned, and a wrong dish name at pickup causes counter disputes | Design review of S5 against S3 and US-11 | Real QR from `GET /api/orders/:id/qr`; names always from the order snapshot (D12) | TC-API-ORD-14, TC-UI-06 |
| M-02 | 5 (design) | S10 dashboard had a **"Mark Collected"** button on every ready order | Insecure: it lets staff skip the single-use pickup-code check (BR8), so food could be handed to the wrong person | RBAC and business-rule review against US-13 | "Mark Collected" opens the pickup-code check; direct status change to COLLECTED is rejected (D16) | TC-API-STF-03, TC-API-STF-05 |
| M-03 | 5 (design) | S4 checkout showed **"Corporate Meal Subsidy"** and **"Taxes & Platform Fees"** rows; S5 offered **"Save to Apple / Google Wallet"** | Out of scope: no payment, subsidy or tax logic (W01), and wallet passes need signing certificates and a paid developer account | Scope check against the MoSCoW list | Rows dropped; wallet moved to Could C07 (D6, D11) | `02-requirements.md §6.1` |
| M-04 | 6 (code) | _<fill in a real case from the code>_ | | | | |

### Things to watch for in this project
These are common AI failure modes for this kind of app. Check each one in the code the AI writes, and log a **real** entry above when you catch one. Only log real cases; judges will ask you to show the commit.

| # | What to watch for | How to catch it |
|---|---|---|
| 1 | **Read-then-write stock check** (`if (remaining >= qty) update(...)`), which oversells under concurrency | TC-API-ORD-09 (parallel requests) + k6 TC-NFR-02 |
| 2 | **Cut-off compared in UTC or browser time** instead of server IST, wrong near 05:30 UTC / midnight IST | TC-U-01..04 with a fake clock |
| 3 | **Prices as floats** (`price: 120.5`) causing rounding errors in totals | TC-U-09; code review |
| 4 | **Role taken from the JWT/cookie** without re-checking the DB, so demoted users keep access | TC-API-RBAC-06 |
| 5 | **Validation only in the UI**, so the API accepts `qty: -3` | TC-API-ORD-05 (bypass the UI with Supertest) |
| 6 | **Different login errors** for an unknown email and a wrong password (user enumeration) | TC-API-AUTH-04 |
| 7 | **QR code containing the user ID, email or a sequential order ID** | TC-API-ORD-14 (decode the QR) |
| 8 | **Pickup code from `Math.random()`** instead of `crypto.randomInt` | Code review |
| 9 | **IDOR**: `GET /api/orders/:id` without an owner check | TC-API-RBAC-04 |
| 10 | **CSV export without formula escaping** (`=HYPERLINK(...)`) | TC-API-RPT-04 |
| 11 | **Prisma partial unique index** silently missing (AI writes `@@unique([userId, orderDate])`, which then blocks re-ordering after a cancel) | TC-API-ORD-12 (cancel, then re-order) |
| 12 | **Outdated library APIs** (e.g. React Router v5 syntax in a v6 project, Express 4 vs 5 error-handling differences, or deprecated Playwright methods) | Build or type errors; official docs |
| 13 | Tests that **assert nothing meaningful** (e.g. only `expect(res.ok)`) or that pass even when the feature is broken | Mutation check: break the code, the test must fail |

---

## Reflection (fill in at the end)

- Where did AI save the most time?
- Where did it cost time (wrong suggestions, debugging its code)?
- What will I verify more carefully next time?
