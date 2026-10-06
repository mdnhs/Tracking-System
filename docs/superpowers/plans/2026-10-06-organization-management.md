# Organization Management — Implementation Plan

Spec: docs/superpowers/specs/2026-10-06-organization-management-design.md
Branch: feature/organization-management (one commit, amended as the branch is worked on)

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/employees.ts` | Pure employee rules (client-safe) |
| `lib/schemas.ts` | `employeeSchema` |
| `lib/organization-actions.ts` | `saveEmployee`, `deleteEmployee` (MD only) |
| `components/organization/employee-sheet.tsx` | Add/edit person sheet |
| `components/organization/people-panel.tsx` | People table, delete confirm, add button |
| `app/(app)/organization/page.tsx` | MD-only page |
| `components/app-sidebar.tsx` | Rename `/structure` label; add MD-only `/organization` |
| `tests/employees.test.ts` | Pure rule tests |
| `tests/organization-schemas.test.ts` | Schema tests |

## Review Focus

- Removal is blocked while the person has tasks or reports, with a clear reason.
- Only the MD can reach `/organization` or call the actions.
- Names stay unique (case-insensitive); ids stay `E{n}` and never collide.
- Role is always one of the hierarchy roles (level > 1).
- No arbitrary pixel values; use existing Tailwind utilities and components.

## Task 1: Pure model, schema and tests (phase 3.1)

**Files:** create `lib/employees.ts`, `tests/employees.test.ts`,
`tests/organization-schemas.test.ts`; modify `lib/schemas.ts`.

**Steps:**
1. Write `tests/employees.test.ts` first (RED).
2. Add `lib/employees.ts`: `selectableRoles`, `nextEmployeeId`,
   `applyEmployeeInput`, `removalBlockReason`.
3. Add `employeeSchema` to `lib/schemas.ts`; write `tests/organization-schemas.test.ts` (RED).
4. Verify: `pnpm test`, `npx tsc --noEmit`, `npx eslint .`.

## Task 2: Server actions (phase 3.2)

**Files:** create `lib/organization-actions.ts`.

**Steps:**
1. Add `saveEmployee` and `deleteEmployee` with the MD check, parse, mutate and
   revalidate.
2. Verify types, lint and tests.

## Task 3: Page, panel, sheet and sidebar (phase 3.3)

**Files:** create `app/(app)/organization/page.tsx`,
`components/organization/people-panel.tsx`,
`components/organization/employee-sheet.tsx`; modify `components/app-sidebar.tsx`.

**Steps:**
1. Build the page with `requireMD()` and pass employees, roles and departments.
2. Build `PeoplePanel` (table, inline delete confirm, add button) and
   `EmployeeSheet` (name, role, department).
3. Wire the sidebar.
4. Verify build, types, lint, and runtime renders of `/organization` (MD) and a
   redirect for a non-MD.

## Task 4: Whole-feature review (phase 3.4)

**Steps:**
1. Review the diff against the spec and the project rules (comments, Tailwind,
   branch scope, duplicated logic).
2. Run `pnpm test`, `npx tsc --noEmit`, `npx eslint .`, `pnpm build`.
3. Runtime smoke test the touched pages and role access.
4. Dispatch a fresh reviewer on the branch diff and address findings.
5. Update the ledger.
