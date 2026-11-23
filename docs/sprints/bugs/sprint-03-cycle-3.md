# Sprint 03 - Test cycle 3
Result: PASS (0 bugs)
Gates: typecheck ✅ · lint ✅ · unit ✅ · build ✅ · e2e ✅ (42 passed, twice; 9 Sprint 4 scripts gated) · clean `npm ci` ✅
Acceptance criteria: 7 of 7 met
Test cases (sprint rows): 58 of 60 pass · 2 manual pending (TC-M-01 camera scan on a real phone, TC-M-02 768 px tablet queue) · 0 skipped

Tested at commit `40b1729`. Regression: 34 shared + 72 backend unit + 97 web · 201 API · 42 E2E (two runs, identical). No flaky tests.

## Retest of cycle 2 bugs
| Bug | Result | Evidence |
|---|---|---|
| BUG-03-002 Menu/editor load forever if the server clock fails | **closed** | EC-03-UI12 and EC-03-UI13 pass (error + "Try again"). The developer's checkout regression test passes (EC-03-23). New probe EC-03-UI15: after a failure, "Try again" loads the menu once the clock answers. |

No new bugs.

## Bugs found in Sprint 03
| Bug | Severity | Found | Closed |
|---|---|---|---|
| BUG-03-001 Employee screens took "today" from the device clock | minor | cycle 1 | cycle 2 |
| BUG-03-002 Endless loading when the server clock can't be read (introduced by the BUG-03-001 fix) | minor | cycle 2 | cycle 3 |

## Manual tests pending (the user runs these)
- **TC-M-01:** a staff phone scans the QR on an employee's phone; the order loads in under 2 s. Typed codes are automated; the real camera needs a device.
- **TC-M-02:** the staff queue at 768 px shows two slot columns; the dashboard at 1280 px shows the KPI tiles in one row.

## Suggestions (not bugs)
- **Staff queue:** collapse COLLECTED tickets, or default to an "Active" filter, so pending work stays on screen at peak.
- **Demo revenue:** the demo's revenue (₹22,020) differs from the mockup's ₹13,800, because the mockup's own figures are inconsistent. Every other mockup number matches.
