# Sprint 03 - Test cycle 4 (post-release bug)
Result: PASS (0 open bugs)
Gates: typecheck ✅ · lint ✅ · unit ✅ · build ✅ · e2e ✅ (staff counter specs)
Acceptance criteria: 7 of 7 met (unchanged)
Test cases (new rows): 3 of 3 pass (EC-03-UI16, EC-03-UI17, EC-03-UI18)

Reported by the user on 2026-11-23, after Sprint 3 was marked done. Fixed and retested in the same cycle.

## BUG-03-003 [major] Leaving the scan page crashes the app when the camera didn't start
- Status: closed
- Criterion: US-13 (staff scan or type the code and hand over), AC 07-1
- Test case: EC-03-UI16 (also EC-03-UI17, EC-03-UI18) in features/12-pickup-scan.md
- Steps to reproduce: log in as STAFF → Scan, on a device where the camera is denied, unavailable or still starting → type the pickup code → Find → HAND OVER → tap Queue (or "Back to queue").
- Expected: the queue opens and loads today's orders.
- Actual: "Something went wrong" error page; no API request is sent. Only happens when the camera did not start, so it looked random.
- Root cause: html5-qrcode 2.3.8 `stop()` throws synchronously (`"Cannot stop, scanner is not running or paused."`) when the scanner is not running. The `useQrCamera` cleanup called `scanner.stop()` whenever a scanner object existed; the `.catch()` never ran because the throw happened before a promise existed. A throw inside an effect cleanup aborts React's commit, so the route error boundary replaced the next page before it could fetch.
- Second problem found while fixing: if the page was left while the camera was still starting, nothing stopped it once it started, so the camera stayed on in the background.
- Fix: `frontend/src/routes/ScanPage.tsx`: `releaseScanner()` wraps stop/clear so it can never throw; cleanup only stops a running scanner; a scanner that finishes starting after the page was left is released at once.
- Failing test (before the fix): `frontend/src/test/scan-camera-cleanup.test.tsx` (EC-03-UI16 ×2 and EC-03-UI18 failed with the same error and "Something went wrong"; all 4 pass after).
- Why earlier cycles missed it: unit tests run in jsdom, which has no camera, so html5-qrcode never loaded; the real-camera check TC-M-01 is manual. The new test uses a fake html5-qrcode that copies the library's throwing `stop()`.

## Suggestions (not bugs)
- Run TC-M-01 (camera scan on a real phone) once more, including denying the camera permission, then leaving the page.
