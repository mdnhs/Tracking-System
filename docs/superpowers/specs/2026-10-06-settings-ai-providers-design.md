# Settings and AI Providers — Design

Date: 2026-10-06
Status: Draft for review

## Goal

Give the Managing Director a Settings area to manage company-wide configuration,
including one or more AI providers (Gemini, Groq, and any future
OpenAI-compatible provider). This is part 1 of a two-part feature; part 2 adds
"Generate with AI" to description and content fields in forms and uses the
provider configuration built here.

## Scope

In scope (part 1):

- A `Settings` sidebar item and `/settings` page, visible only to the MD.
- Three tabs: General, Workflow, AI.
- Multiple saved AI provider profiles with one default.
- API keys encrypted at rest; never sent to the browser.
- Fetching a provider's model list from its `/models` endpoint.
- A server-side `generateText` client, ready for part 2 but not wired to any form.

Out of scope:

- "Generate with AI" buttons in forms (part 2, separate spec).
- Organization management: adding or editing employees and roles (future work).
- Moving storage from JSON to Postgres (planned separately; this design keeps
  the swap contained to one module).

## Decisions

| Topic | Decision |
| --- | --- |
| Provider config | Multiple named profiles, one marked default |
| Model list | Fetched from `GET {endpoint}/models`, user ticks models to keep; manual add allowed |
| Access | MD only, for both viewing and editing |
| Extra tabs | General and Workflow |
| API key storage | AES-256-GCM encrypted in the data store; secret from `SETTINGS_SECRET` |
| Provider protocol | OpenAI-compatible (`/models`, `/chat/completions`) |

## Data model

```ts
interface AppSettings {
  general: { companyName: string; tagline: string }
  workflow: { delayReasons: string[]; attentionWindowDays: number }
  ai: {
    defaultProviderId: string | null
    providers: AiProvider[]
  }
}

interface AiProvider {
  id: string                     // uuid
  name: string                   // "Groq", "Gemini"
  endpoint: string               // e.g. https://api.groq.com/openai/v1
  apiKeyEncrypted: string | null // "iv:authTag:ciphertext", server only
  apiKeyLast4: string | null     // last 4 characters, for the masked hint
  models: string[]               // ticked model ids
  defaultModel: string | null    // one of models
}
```

- `TrackingData` gains a `settings: AppSettings` field.
- `meta.company`, `meta.tagline` and the top-level `delayReasons` move into
  `settings`. The store upgrades older data on load: it builds `settings` from
  the old fields when `settings` is missing, and removes the old fields.
- Defaults: `attentionWindowDays` is 2 (today's hardcoded value), no providers,
  no default provider.

### Browser-safe view

Pages and client components receive `PublicSettings`, where each provider has
`apiKeyHint` (`"••••" + apiKeyLast4`, or `null`) and `hasApiKey` instead of
`apiKeyEncrypted` and `apiKeyLast4`. The encrypted string never leaves the
server, and showing the hint never needs a decrypt.

### Storage boundary

`lib/settings.ts` is the only module that reads or writes settings:

- `getSettings(): Promise<AppSettings>` — server only, includes encrypted keys.
- `getPublicSettings(): Promise<PublicSettings>`
- `updateSettings(fn)` — applies a change to the settings and persists it.

The rules for changing settings (unique provider names, keeping a stored key
when the key field is left blank, clearing the default when its provider is
deleted) are pure functions in `lib/settings-model.ts`, applied through
`updateSettings`. Today `lib/settings.ts` calls `getData()` / `mutate()` from
`lib/store.ts`; the Postgres move replaces only this module's internals.

Pages read settings through the session, which carries `PublicSettings` only,
so a page cannot pass an encrypted key to a client component by accident.

## Encryption

- `lib/crypto.ts` (server only) exposes `encryptSecret(plain)` and
  `decryptSecret(stored)` using AES-256-GCM with a random 12-byte IV per value.
- The 32-byte key is derived from `SETTINGS_SECRET` (env var, kept in
  `.env.local`, not committed) with SHA-256.
- If `SETTINGS_SECRET` is missing, saving or using an API key fails with a
  clear error. General and Workflow settings keep working. The AI tab shows a
  warning that explains how to set the secret.
- Decryption failure (wrong or rotated secret) is reported as "Stored API key
  cannot be read — enter it again", never as a crash.

## Access control

- New `requireMD()` in `lib/session.ts`: redirects non-MD users to their home
  page (`/dashboard` for management, `/employee` for employees).
- Every settings server action re-checks `user.role === "MD"` and returns an
  error otherwise.
- The sidebar shows `Settings` only when the current user is the MD.

## UI

`/settings` with shadcn `Tabs`; the active tab is kept in `?tab=` so refresh
keeps it. All forms use shadcn `Field` with react-hook-form and zod, following
the existing form pattern, with schemas in `lib/schemas.ts` shared by client
and server.

### General tab

Company name (required, max 80) and tagline (max 160). Saved values replace
the hardcoded sidebar subtitle and dashboard description.

### Workflow tab

- Delay reasons: list with a remove button per item and an input to add one.
  At least one reason; no duplicates (case-insensitive); each max 80 characters.
  Removing a reason does not change tasks that already recorded it.
- Needs Attention window: whole number of days, 1–14. `needsAttention` reads
  this value instead of its hardcoded 2.

### AI tab

- Provider cards: name, endpoint, key hint or "No key", ticked models,
  "Default" badge. Actions: Edit, Set as default, Delete (with confirmation).
- "Add provider" opens a Sheet with:
  - Name (required, unique, max 40).
  - Preset: Groq, Gemini or Custom. Groq fills
    `https://api.groq.com/openai/v1`; Gemini fills
    `https://generativelanguage.googleapis.com/v1beta/openai`. The endpoint stays
    editable.
  - API Endpoint (required, `https://` only).
  - API Key (password input). Left blank on edit, the stored key is kept;
    a separate "Remove key" action clears it.
  - Models: "Fetch models" calls the server, which lists model ids; the user
    ticks the ones to keep. An input adds a model id by hand. At least one
    model before saving.
  - Default model: chosen from the ticked models.
- Deleting the default provider clears `defaultProviderId`; the first remaining
  provider does not silently become default.

## AI client

`lib/ai/client.ts` (server only), OpenAI-compatible:

- `listModels(endpoint, apiKey)` → `GET {endpoint}/models`, returns sorted
  model ids.
- `generateText({ prompt, system, model? })` → uses the default provider and
  its default model (or `model` if given), calls
  `POST {endpoint}/chat/completions`, returns the first choice's text.
  Built and unit-tested now; first used in part 2.

"Fetch models" from the Sheet calls a server action with the endpoint and
either the newly typed key or, when editing, the stored key. The key typed in
the form goes to the server action only, never to a third party from the
browser.

### Safety

- Endpoint must be `https://`. Hosts that are `localhost` or resolve to private,
  loopback or link-local addresses are rejected, because the server makes the
  request.
- 15-second timeout per request.
- The key is sent only in the `Authorization: Bearer` header. Keys never appear
  in logs, error messages or responses.

### Errors

| Situation | Message shown |
| --- | --- |
| 401 / 403 | API key was rejected by the provider |
| Network error or timeout | Could not reach the endpoint |
| Other non-2xx | Provider error (status) with a short, key-free summary |
| Unexpected response shape | The endpoint did not return an OpenAI-compatible response |

Errors appear through `FieldError` in the relevant form.

## Testing

Unit (node test runner, as used so far):

- Encrypt/decrypt round trip; tampered ciphertext and wrong secret fail.
- Public settings never contain `apiKeyEncrypted` or the full key.
- Store upgrade builds `settings` from old `meta` and `delayReasons`.
- Endpoint validation: rejects `http://`, `localhost` and private IPs.
- `listModels` / `generateText` against a stubbed `fetch`: success, 401,
  timeout, bad shape.
- Workflow validation: duplicates, empty list, window bounds.

Browser:

- MD sees Settings; other roles do not and are redirected from `/settings`.
- General save updates the sidebar and dashboard text.
- Workflow save changes delay reason options and the Needs Attention window.
- Provider add, edit (blank key keeps the old key), set default, delete.
- Fetch models error path with a wrong key.

A real Groq or Gemini call is tested only once the user enters their own key in
the UI; the key is not shared in chat.

## AI transparency

Part 1 generates no content. Part 2's spec will cover the "AI-generated" label,
human review before saving and disclosure at the point of use, as required by
the project's AI transparency rules.
