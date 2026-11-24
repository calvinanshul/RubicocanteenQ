# Stage 8a — 10-Minute Demo Script

**Principle:** the demo walks through the **stages**, not only the screens. Each part shows the evidence for one stage and then the working feature that comes from it.

## Set-up checklist (30 min before)

- [ ] Production URL loads; `/api/health` is green
- [ ] Demo data reset: `npm run db:seed:demo` (today's menu, ~40 orders spread over the slots for a full dashboard, **Veg Biryani with 1 portion left**)
- [ ] Browser windows ready: **Employee** (phone or DevTools mobile view), **Staff** (tablet size), **Manager** (desktop)
- [ ] Repo open on: `docs/README.md`, the traceability matrix, the CI run, and the Playwright HTML report
- [ ] Backup: a recorded video of the golden path in case of network problems
- [ ] Timer visible

## Running order

| Time | Section | Show | Say (key message) |
|---|---|---|---|
| **0:00–0:45** | Problem | `01-discovery.md`: problem statement + the Priya persona | "Lunch queues cost employees 15–25 minutes, and the kitchen guesses quantities. CanteenQ lets people order before 11:00 and collect with a QR code." |
| **0:45–1:45** | Discovery → requirements | Personas table; assumptions (point to A3 *no payment* and A11 *IST*); MoSCoW with the **Won't** list | "I wrote down my assumptions so they could be tested. The Won't list is how I kept a one-week scope." |
| **1:45–2:30** | Stories | US-09 with its 11 acceptance criteria, especially AC5 (two people, one portion) | "Every Must feature has a story, and the criteria include the nasty cases." |
| **2:30–3:15** | Tech decision + architecture | ADR v1 → v2 scoring table; architecture diagram (one Next.js app on Vercel → Postgres); order sequence diagram; Stitch design + decisions D1–D21 | "My first ADR picked Next.js. When I re-scored with my real skills, React + Express won narrowly, and I built Sprints 1–4 on it. Then I moved to one Next.js app on Vercel (ADR-002): same API, and pages and API share one domain, so cookies stay first-party. Stock is protected by an atomic conditional UPDATE, not a read-then-write." |
| **3:15–6:15** | **Live demo: golden path** | **Employee (phone):** menu → add Veg Biryani → slot 13:00 → confirm → QR. **Staff (tablet):** queue → Start → Ready → type the code → Hand over. **Employee:** status shows COLLECTED. **Manager:** dashboard tiles update; export CSV | Narrate the roles: "Each role sees only its own screens." |
| **6:15–7:00** | Live demo: edge cases | 1) Second employee tries the sold-out item → *Sold out*. 2) Staff scan the same code again → *Already collected*. 3) Employee opens `/manager/dashboard` → *Not authorised* | "These are acceptance criteria from US-08, US-13 and US-03 running live." |
| **7:00–8:30** | Testing | Test pyramid (counts); **traceability matrix** (zero gaps); CI green; Playwright report; **k6 results table** + oversell SQL = 0 rows; bug log (count by severity, one interesting bug and its root cause) | "111 test cases, every acceptance criterion traced. Under 100 concurrent users, p95 was ___ ms and nothing was oversold." |
| **8:30–9:15** | AI usage | Prompt journal: the 3+ **AI mistakes caught**. Show one diff (e.g. read-then-write stock check → atomic update) | "AI drafted a lot, but I verified it. Here's where it was wrong and how my tests caught it." |
| **9:15–10:00** | Retro | `08-retrospective.md`: what went wrong, what I'd change | Close with the one thing you'd do differently. |

## Likely judge questions (prepare answers)

| Question | Where the answer is |
|---|---|
| "How do you prevent two people from buying the last portion?" | `05-architecture.md §5` + TC-API-ORD-09 + k6 |
| "How do you test the 11:00 cut-off without waiting?" | Injected clock / `x-test-now`, disabled in production (TC-API-SYS-02) |
| "Why not online payment?" | Assumption A3, Won't W01 |
| "What if the staff phone has no camera?" | Manual code entry, US-13 AC3 |
| "Explain this line of code…" | You own it; the AI journal shows what you changed |
| "Why does the employee get 404, not 403, for someone else's order?" | It avoids revealing that the order exists (IDOR protection, US-03 AC4) |
| "What would you do with one more week?" | Should and Could list + retro |
| "Why did you change your tech decision?" | ADR-001 §3 *What changed between v1 and v2* |
| "How do cookies work with two hosts?" | `05-architecture.md §1`: there is only one host; pages and `/api` are the same Next.js app on Vercel |
| "Does it integrate with anything real?" | QR codes, CSV export and email: a welcome email on sign-up and an email when an admin changes a role, delivered through Brevo SMTP (`05-architecture.md` §6, US-01 AC7, US-04 AC6). Show one arriving: change a demo user's role and open the inbox |
| "What if the server is slow during the demo?" | The UI shows a loader (top progress bar and spinner) while a request is slow |
| "Did you follow the AI design blindly?" | `02-requirements.md §6.1` (21 decisions) and prompt journal M-01..M-03 |
