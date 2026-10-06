# AI Generate Fields — Implementation Plan (Phase 2)

Spec: docs/superpowers/specs/2026-10-06-ai-generate-fields-design.md
Branch: feature/ai-generate-fields (one commit, amended as the branch is worked on)

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/ai/fields.ts` | `AI_FIELDS`, `AiField`, `AiFieldContext` (client-safe) |
| `lib/ai/prompts.ts` | `buildPrompt(field, context)` |
| `lib/ai/actions.ts` | `generateFieldText` server action |
| `lib/schemas.ts` | `aiFieldSchema` |
| `components/ai-field.tsx` | `AiField` control + AI draft notice |
| `components/task-create-sheet.tsx` | Use `AiField` for the description |
| `components/task-forms.tsx` | Use `AiField` for update text and delay explanation |
| `components/task-actions.tsx` | Pass task context to the task forms |
| `components/report-form.tsx` | Use `AiField` for report fields |
| `app/(app)/employee/page.tsx` | Pass employee context to `ReportForms` |
| `tests/ai-prompts.test.ts` | Prompt builder tests |
| `tests/ai-schemas.test.ts` | AI field schema tests |

## Review Focus

- Generated text is never auto-submitted; the user edits and saves.
- AI disclosure is visible at the point of interaction and on the draft.
- A missing provider configuration shows a helpful message, not a crash.
- `buildPrompt` never includes missing context and caps long values.
- No arbitrary pixel values; use existing Tailwind utilities.

## Task 1: Server generation (phase 2.1)

**Files:** create `lib/ai/fields.ts`, `lib/ai/prompts.ts`, `lib/ai/actions.ts`,
`tests/ai-prompts.test.ts`; modify `lib/schemas.ts`, `tests/ai-schemas.test.ts`.

**Steps:**
1. Add `AI_FIELDS` / `AiField` / `AiFieldContext`.
2. Write `tests/ai-prompts.test.ts` first (RED).
3. Add `buildPrompt` with the instruction map and 200-char cap.
4. Add `aiFieldSchema` to `lib/schemas.ts`; write `tests/ai-schemas.test.ts` (RED).
5. Add `generateFieldText` in `lib/ai/actions.ts` with the error mapping.
6. Verify: `pnpm test`, `npx tsc --noEmit`, `npx eslint .`.

## Task 2: Control + task description (phase 2.2)

**Files:** create `components/ai-field.tsx`; modify `components/task-create-sheet.tsx`.

**Steps:**
1. Build `AiField` with the generate button, draft notice and error line.
2. Replace the description `Controller` in `TaskCreateSheet` with `AiField`,
   passing watched title, project and department as context.
3. Verify build, types, lint, and a runtime render of `/dashboard`.

## Task 3: Task update + delay explanation (phase 2.3)

**Files:** modify `components/task-forms.tsx`, `components/task-actions.tsx`.

**Steps:**
1. Add a `taskTitle` (and project/department) prop to `UpdateForm` and
   `DelayReasonForm`; use `AiField` for their textareas.
2. Pass the context from `TaskActions`.
3. Verify build, types, lint, and a runtime render of a task detail page.

## Task 4: Report forms (phase 2.4)

**Files:** modify `components/report-form.tsx`, `app/(app)/employee/page.tsx`.

**Steps:**
1. Give `ReportForms` an `employee` context prop.
2. Replace the report `TextField`s with `AiField` (multiline as today).
3. Pass the employee name and department from the employee page.
4. Verify build, types, lint, and a runtime render of `/employee`.

## Task 5: Whole-feature review (phase 2.5)

**Steps:**
1. Review the diff against the spec and the AI transparency checklist.
2. Check comments, Tailwind usage, branch scope and duplicated logic.
3. Run `pnpm test`, `npx tsc --noEmit`, `npx eslint .`, `pnpm build`.
4. Runtime smoke test the touched pages.
5. Dispatch a fresh reviewer on the branch diff and address findings.
6. Update the ledger.
