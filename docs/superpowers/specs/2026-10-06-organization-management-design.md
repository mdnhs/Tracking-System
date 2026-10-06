# Organization Management — Design

Date: 2026-10-06
Status: Approved

## Goal

Give the Managing Director a page to add, edit and remove employees, so the
organization structure stays current without editing the data store by hand.

## Scope

In scope:

- An MD-only `/organization` page.
- Add and edit a person: name, role (chosen from the existing hierarchy) and
  department.
- Remove a person, blocked while they have tasks or daily reports.
- Sidebar: a new MD-only "Organization" item; the existing `/structure` item is
  renamed "Structure".

Out of scope:

- Editing hierarchy roles, levels or responsibilities (roles stay fixed).
- A managed department list; department stays free text with suggestions.
- Editing the synthetic MD user.
- Moving storage from JSON to Postgres.

## Decisions

| Topic | Decision |
| --- | --- |
| Access | MD only, like Settings |
| Page | New `/organization`, MD-only sidebar item |
| Removal | Blocked while the person has any tasks or daily reports |
| Scope | Employees only; roles chosen from the hierarchy (level > 1) |

## Data model

`Employee` is unchanged: `{ id, name, role, department }`. Ids are `E{n}`; a new
person takes the next number. No new fields are added.

## Rules (pure, `lib/employees.ts`)

- `selectableRoles(hierarchy)` — role names with `level > 1`; the MD role is not
  assignable to an employee.
- `nextEmployeeId(employees)` — the next `E{n}`, starting from the highest.
- `applyEmployeeInput(employees, change, newId)` — adds or edits; rejects an
  unknown id and a duplicate name (case-insensitive).
- `removalBlockReason(data, id)` — a message when the person has tasks or daily
  reports, otherwise `null`.

## Server (`lib/organization-actions.ts`)

- `saveEmployee(values)` — MD check, zod parse, role must be in
  `selectableRoles`, then `mutate` with `applyEmployeeInput`.
- `deleteEmployee(id)` — MD check, `mutate`: refuse with `removalBlockReason`,
  otherwise remove the person.

Both revalidate the layout, following the existing action pattern.

## UI

- `/organization` page: `requireMD()`, a header, and a People card with a table
  (person, role, department, actions) and an "Add person" button.
- `EmployeeSheet` (add and edit) uses the existing `Field` + react-hook-form
  pattern: name, role (`FormSelect`), department (an `Input` with a `datalist`
  of current departments).
- Delete uses the inline confirm pattern; a blocked removal shows the reason.
- Sidebar: `/structure` label becomes "Structure"; a new MD-only "Organization"
  item points at `/organization`.

## Testing

Unit (node test runner):

- `nextEmployeeId`, `applyEmployeeInput` (add, edit, unknown id, duplicate
  name), `removalBlockReason` (tasks, reports, none), `selectableRoles`.
- `employeeSchema` (required name and department, length caps).

Browser:

- The MD sees Organization; other roles do not and are redirected from
  `/organization`.
- Add a person, edit them, remove a person with no work.
- A person with tasks cannot be removed and the reason is shown.

## Phases

1. Pure model, schema and tests.
2. Server actions.
3. Page, panel, sheet and sidebar.
4. Whole-feature review.
