# Sprint 02 - Test cycle 1
Result: FAIL (1 open bug)
Gates: typecheck ✅ · lint ✅ · unit ✅ (except the bug probe) · build ✅ · e2e ✅ (33 passed; 12 Sprint 3–4 scripts gated) · clean `npm ci` ✅
Acceptance criteria: 11 of 12 met (04-1 partly met)
Test cases (sprint rows): 72 of 73 pass · 0 manual pending · 0 skipped

Tested at commit `96de3fc`. Regression: 33 shared + 36 API unit + 69 web (1 failing: the bug below) · 147 API · 33 E2E. TC-API-ORD-09 and EC-02-11 (concurrency) passed 5 out of 5 runs during development and again here.

**Developer's test-script changes: reviewed and confirmed.**
- `backend/tests/api/helpers.ts`: `placeOrder` rotates the default slot. This is a test-isolation fix: scripts that share a fixed date were filling one slot's capacity of 30. Every assertion is unchanged, and the capacity tests set their slot explicitly. The O3 block's `placed()` pins 13:00, which keeps its `slotEnd: '13:15'` assertion meaningful.
- `frontend/tests/e2e/sprint02/ordering.spec.ts` TC-UI-06: `expect.poll` waits for the QR PNG to load before checking `naturalWidth ≥ 180`. The threshold is unchanged; this only removes a race.

**New tests this cycle** (now in the regression suite and the feature files):
- `backend/tests/api/sprint02/probes.test.ts`: EC-02-18..25
- `frontend/src/test/sprint02-probes.test.tsx`: EC-02-UI4..UI17, covering AC 03-2 chip counts, 03-3 countdown, 03-4 states, 04-4 inline errors and the S5 states

## BUG-02-001 [minor] Logging out leaves the cart behind for the next person on the same browser
- Status: closed (retested in cycle 2)
- Fix: the stored cart now records its owner (`features/cart/storage.ts`), so another user's cart is ignored, and `useLogout` removes it on every logout path; regression tests in `features/cart/storage.test.ts`.
- Criterion: 04-1 (cart; "cleared on order or day change", FE-42) · privacy on shared devices
- Test case: EC-02-UI17 in features/07-menu-browsing.md
- Steps to reproduce: As employee A, add Veg Biryani on the menu → Log out → log in as employee B in the same tab → open the menu.
- Expected: B starts with an empty cart; A's choices aren't kept after logout.
- Actual: The cart lives in `sessionStorage` (`cq_cart`), keyed only by date, and logout doesn't clear it, so B sees A's Veg Biryani already in the cart and could order it by mistake.
- Failing test: `frontend/src/test/sprint02-probes.test.tsx` › "cart and logout › EC-02-UI17 logging out clears the cart…" (fails 3 out of 3 runs)
- Likely location:
  - `frontend/src/layouts/useLogoutAction.ts`: logout clears the query cache but not the cart.
  - `frontend/src/features/cart/CartContext.tsx`: the stored cart isn't tied to the user.

## Suggestions (not bugs)
- **Slot picker keyboard:** the picker is a `radiogroup` whose options are separate tab stops. The usual radio pattern is one tab stop with arrow-key movement. It works with the keyboard as it is; consider the arrow-key pattern in the accessibility pass (FE-95).
- **Long idempotency keys:** keys are truncated to 100 characters, so two different long keys from the **same** user that share the first 100 characters would map to one order. Real clients send UUIDs, but rejecting keys over 100 characters (400) would be cleaner.
- **Countdown on tomorrow's tab:** it reads "24 h 42 min left". Showing the cut-off time there instead ("Order before 11:00 tomorrow") would read better.
