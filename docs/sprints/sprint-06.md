# Sprint 06 · Server Components & Server Actions

**Goal:** Pages load their data on the server and mutations go through Server Actions. Role checks happen on the server before any HTML is sent. Live screens still refresh on their own.
**Type:** Technical migration. User-visible behaviour is unchanged except that first paint arrives with data (no loading flash).

## Approach
- **Reads:** each `page.tsx` is an async Server Component that calls `backend` services directly (no HTTP hop) and passes plain DTOs to small client components.
- **Writes:** forms and buttons call Server Actions in `backend/src/actions/` (re-exported from `frontend/app/**/actions.ts`). Each action validates with the same `shared` zod schemas, checks the session and role, and calls the same service. Then it runs `revalidatePath` / `redirect`.
- **Live screens:** these keep polling with a tiny client component that calls `router.refresh()` at the old intervals. Screens: staff queue 15 s, order pass 20 s while live, slots 30 s, dashboard 30 s, prep 5 min.
- **Route Handlers stay** for `health`, `time`, `cron`, CSV exports and the public JSON API used by tests.

## Acceptance criteria (committed)

| AC | Criterion | Tests |
|---|---|---|
| 06-1 | `middleware.ts` verifies `cq_session` (jose, edge-safe). A logged-out user hitting any protected URL is redirected to `/login?next=<url>` with no client flash. | E2E auth, deep link |
| 06-2 | Server-side role gating: role group `layout.tsx` files (`(employee)`, `(staff)`, `(manager)`, `(admin)`) load the user from the DB and `redirect('/403')` for the wrong role. Disabled users are logged out. `RequireRole` client gate removed. | roles.spec, RBAC matrix |
| 06-3 | Read pages are Server Components fetching via services: menu, checkout, my orders, order pass, profile, staff queue/prep, dashboard, exports, daily-menu editor, catalogue, users, settings. | E2E per page |
| 06-4 | All mutations are Server Actions: login, signup, logout, place/cancel order, collect/no-show/status changes, scan redeem, menu item CRUD, daily-menu publish, user role/disable/edit, settings, closed dates. Same validation messages and field errors as today. | E2E + new action unit tests |
| 06-5 | Live screens auto-refresh at the old intervals via `router.refresh()` and keep the "slow connection" banner. | counter.spec, golden.mobile |
| 06-6 | Cart and QR scanner stay client components. The scan page's camera cleanup (BUG-03-003) still holds. | counter.spec |
| 06-7 | `loading.tsx`, `error.tsx`, `not-found.tsx`, `/403` replace `ErrorPages.tsx`/`FullPageLoader`, with the same copy and a11y. | TC-UI-03 |
| 06-8 | React Query removed, or kept only where a client cache is still needed (document why). `frontend/src/api/hooks.ts` gone. | build |
| 06-9 | No page ships secrets or Prisma to the client (`server-only` imports in backend). Client bundle has no `@prisma/client`. | build check |

## Out of scope
Netlify deploy (Sprint 07) · new features · visual redesign.
