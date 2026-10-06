# AI Generate Fields — Design (Phase 2)

Date: 2026-10-06
Status: Approved
Depends on: Settings and AI Providers (phase 1, merged in `f6aae96`)

## Goal

Let a signed-in user generate a first draft for the free-text fields in forms with
the default AI provider configured in Settings. The draft lands in the field as
editable text; the user reviews and edits it before saving.

## Scope

Eligible fields (all of them):

- Task create: `description`
- Task detail: `task-update` (Add an update), `delay-explanation`
- Morning report: `priorities`, `plannedWork`, `importantTasks`, `blockers`
- Evening report: `completed`, `ongoing`, `pending`, `problems`, `incompleteReason`

Out of scope:

- Non-text fields (titles, selects, dates).
- Auto-submitting or auto-saving generated text.
- Storing AI provenance on saved records (decision: label the draft only).
- A per-user AI quota or rate limiting (future work).

## Decisions

| Topic | Decision |
| --- | --- |
| Access | Any signed-in user; generation uses the default provider |
| Field coverage | All free-text description/content fields |
| Result handling | Editable draft, human review, never auto-submitted |
| Provenance | Label the draft at the point of interaction; nothing persisted |
| Provider | The default provider from Settings; missing config is a clear error |

## Server

- `lib/ai/fields.ts` — the `AiField` enum and `AiFieldContext` type (client-safe).
- `lib/ai/prompts.ts` — `buildPrompt(field, context)` returns `{ system, prompt }`.
  Context values are trimmed and capped at 200 characters. The system message
  asks for the text only: no preamble, quotes or markdown.
- `lib/schemas.ts` — `aiFieldSchema` validates the field enum and the optional
  context.
- `lib/ai/actions.ts` (`"use server"`) — `generateFieldText({ field, context })`
  validates input, builds the prompt, calls the existing `generateText`, trims
  the result, and returns `{ ok, text }` or `{ ok, error }`.
- `generateText` is unchanged: it uses the default provider and model, decrypts
  the stored key and re-checks the endpoint.

Error mapping: provider-configuration errors ("no provider/model/key", unreadable
key) become "AI is not set up yet. Ask the Managing Director to configure a
provider in Settings." Other `AiError` messages pass through unchanged. Unknown
errors become "AI generation failed. Try again."

## Client

- `components/ai-field.tsx` — `AiField` wraps a `Controller`, a label row with a
  "Generate with AI" button, the textarea/input, and an AI draft notice. It is
  generic over the form values, like the existing `TextField` in `report-form.tsx`.
- The generated text is written with `field.onChange(text)` and marks the value
  as an unreviewed AI draft. Any manual edit clears the mark.
- The button shows "Generating…" while pending and disables itself.
- `TaskActions` passes the task title, project and department to `UpdateForm` and
  `DelayReasonForm`; the delay form also passes the selected reason. `TaskCreateSheet`
  passes the watched title, project and department. Report forms pass the
  employee's name and department.

## AI transparency

- Disclosure at the point of interaction: the control is labelled
  "Generate with AI" with an AI icon, and it sits in the field's own label row.
- Label: while the field holds an unreviewed draft, a visible line reads
  "AI-generated draft — review and edit before saving." (`role="status"`).
- Human control: generated text is never submitted automatically; the user edits
  and saves through the normal form button.
- No deceptive behaviour: no hidden AI, no auto-accept, no dark patterns.

## Errors

| Situation | Message shown |
| --- | --- |
| No provider/model/key configured | AI is not set up yet. Ask the Managing Director to configure a provider in Settings. |
| Provider rejects the key / unreachable / bad shape | The existing `AiError` message |
| Empty model reply | The AI provider returned no text |
| Unknown failure | AI generation failed. Try again. |

## Testing

Unit (node test runner):

- `buildPrompt`: includes the field instruction and each present context fact,
  ignores missing facts, caps long values, and returns the system message.
- `aiFieldSchema`: accepts a known field and rejects an unknown one.
- `generateFieldText` is not unit-tested directly, because `generateText` reads
  the store through `next/server` `connection()` and cannot run under node:test.
  Its parts (prompt, schema, `generateText` error surface) are each covered.

Browser:

- Generate on the task description fills the field with a draft and shows the
  label; editing removes the label; the form still saves normally.
- Generate with no provider configured shows the setup message.
- Generate on a report field and a task update.

## Phases

1. Server: fields, prompts, schema, action + tests.
2. Client control + task create description.
3. Task update + delay explanation.
4. Report forms (morning and evening).
5. Whole-feature review.
