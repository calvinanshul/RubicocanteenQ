# Test cases: how they are organised

All test cases live here, **arranged by feature**:

- **[TEST-CASES.md](TEST-CASES.md)**: the main file. Every case in one place, with a summary per feature and per sprint. It is generated, so don't edit it by hand.
- **[features/](features/)**: one file per feature (sign up, login, roles, ordering …). Each row has ID, title, sprint, level, priority, story/AC, steps, expected result, the automation script and its status. **These files are the source of truth.**
- **[contracts.md](contracts.md)**: module names, API details and UI selectors that the scripts written ahead of the code rely on.

After changing a feature file, rebuild the main file and check coverage:
```bash
python3 scripts/test-cases-index.py             # rebuild TEST-CASES.md, report gaps
python3 scripts/test-cases-index.py --sprint 02 # list one sprint's cases across all features
```

The automation **scripts** stay organised by sprint (so they can be switched on per sprint):

| Sprint | Scripts |
|---|---|
| 01 | `shared/tests/`, `backend/tests/unit/*.test.ts`, `backend/tests/api/*.test.ts`, `frontend/src/**/*.test.tsx`, `frontend/tests/e2e/*.spec.ts` |
| 02 | `backend/tests/unit/sprint02.*`, `backend/tests/api/sprint02/`, `frontend/tests/e2e/sprint02/` |
| 03 | `backend/tests/unit/sprint03.*`, `backend/tests/api/sprint03/`, `frontend/tests/e2e/sprint03/` |
| 04 | `backend/tests/unit/sprint04.*`, `backend/tests/api/sprint04/`, `frontend/tests/e2e/sprint04/`, `backend/tests/perf/` |

Script paths in the feature files are abbreviated: `shared/` = `shared/tests`, `api-u/` = `backend/tests/unit`, `api/` = `backend/tests/api`, `web/` = `frontend/src`, `e2e/` = `frontend/tests/e2e`.

## IDs
- **TC-…** test cases from [`07-test-cases.md`](../../07-test-cases.md) (same IDs, so the traceability matrix still works).
- **EC-NN-xx** extra edge cases for sprint NN (`EC-02-U1` = unit, `EC-02-05` = API, `EC-02-UI1` = UI).
- The test title in the script starts with the ID, so `npx vitest run -t "TC-API-ORD-09"` or `npm run test:e2e -- -g "TC-UI-06"` runs one case.

## Scripts written ahead of the code (sprint gate)
Scripts for sprints 2–4 were written from the API spec, the UI spec and the stories **before** those sprints are built. They are the acceptance contract.

- Every future-sprint script is wrapped in `sprintActive(N)` (`backend/tests/sprintGate.ts`, `frontend/tests/e2e/sprintGate.ts`). It reads [`STATUS.md`](../sprints/STATUS.md) and **skips the sprint's scripts while the sprint is `not started`**. When sprint-development sets the sprint to `in development`, they switch on automatically, so the developer sees them fail and then pass.
- `SPRINT_TESTS=all` forces every gated script to run (useful to preview a sprint's contract).
- `SPRINT_STRETCH=1` also runs the Sprint 4 stretch scripts (ST-16/17/18).
- Unit scripts load not-yet-written modules through a typed dynamic import, so `tsc` stays green before the code exists.

## Contracts the scripts rely on
[contracts.md](contracts.md) lists: module paths and function names for unit scripts, and the **UI contract** (accessible names, labels and `data-testid`s) that E2E scripts select by. If the implementation needs a different contract, sprint-development marks the bug `disputed` with the reason; sprint-testing then corrects the script and the contract in contracts.md.

## Running
| What | Command |
|---|---|
| Everything for the current state | `npm run test:unit && npm run test:api && npm run test:e2e` |
| One sprint's API scripts | `cd backend && npx vitest run --config vitest.api.config.ts tests/api/sprint02` |
| One sprint's E2E scripts | `npm run test:e2e -- sprint02` |
| Preview a future sprint's contract | prefix with `SPRINT_TESTS=all` |
| Load test (staging only) | see `backend/tests/perf/order-rush.js` header |

## Status column
`☐` not run · `✅` pass · `❌` fail (add BUG id) · `⏭` blocked/skipped (say why) · `M` manual (record the result in the cycle report).
