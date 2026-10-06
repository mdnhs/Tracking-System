# Settings and AI Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an MD-only `/settings` page with General, Workflow and AI tabs, where the AI tab manages multiple OpenAI-compatible providers (Groq, Gemini, future ones) with encrypted API keys and fetched model lists.

**Architecture:** Settings live in the existing JSON data store under a new `settings` field; pure rules sit in `lib/settings-model.ts`, server access in `lib/settings.ts`, encryption in `lib/crypto.ts`, and an OpenAI-compatible client in `lib/ai/`. Pages only ever see a browser-safe `PublicSettings` through the session. Forms follow the existing shadcn `Field` + react-hook-form + zod pattern.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript, zod 4, react-hook-form 7, shadcn (Base UI style `base-vega`), Node 26 built-in test runner with type stripping.

**Spec:** `docs/superpowers/specs/2026-10-06-settings-ai-providers-design.md`

## Global Constraints

- Settings page and every settings action: MD only (`user.role === "MD"`).
- API keys: AES-256-GCM, 12-byte random IV, key = SHA-256 of `SETTINGS_SECRET`; stored as `iv:authTag:ciphertext` (base64 parts).
- `SETTINGS_SECRET` lives in `.env.local` (git-ignored), minimum 16 characters.
- The encrypted key and the full key never reach the browser; hint is `"••••" + apiKeyLast4`.
- Endpoints: `https://` only; reject `localhost`, `*.localhost`, private, loopback, link-local and CGNAT addresses; `redirect: "error"` on every provider request.
- Provider request timeout: 15 seconds.
- Presets: Groq `https://api.groq.com/openai/v1`, Gemini `https://generativelanguage.googleapis.com/v1beta/openai`.
- Limits: company name 1–80, tagline ≤160, delay reason 1–80 and unique (case-insensitive), at least one reason, attention window 1–14 whole days, provider name 1–40 and unique (case-insensitive), at least one model, default model must be one of the selected models.
- Default attention window: 2 days.
- Tailwind: no arbitrary `[..px]` values. Comments only for a non-obvious why, one line.
- Prettier: run only on files this plan touches, never a glob over unrelated files.
- Commits: one commit on `feature/settings-ai`, amended as work progresses, message in the user's format (`feat: settings-ai`, numbered body, no Co-Authored-By).

## Review Focus

- Editing a provider and leaving API Key blank must keep the stored key — pinned in Task 2 (`applyProviderInput` test).
- Deleting the default provider must clear the default, and deleting another provider must not change it — pinned in Task 2 (`removeProvider` tests).
- A provider error body that echoes the API key must not put the key into the shown message — pinned in Task 5.
- Gemini returns ids like `models/gemini-2.0-flash`; the list must show clean, unique, sorted ids — pinned in Task 5.
- An endpoint typed with a trailing slash (`.../openai/v1/`) must not produce `//models` — pinned in Task 4 (`checkEndpoint` returns the URL without trailing slash) and Task 5.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `tests/register.mjs` | Node resolve hook mapping `@/x` to `./x.ts` so tests can import app modules |
| `tests/*.test.ts` | Unit tests (node test runner) |
| `lib/settings-model.ts` | Settings types, defaults, presets, legacy upgrade, public view, pure provider rules (client-safe) |
| `lib/crypto.ts` | Encrypt/decrypt secrets with `SETTINGS_SECRET` (server only) |
| `lib/ai/endpoint.ts` | Validate provider endpoints (https, no private hosts) |
| `lib/ai/client.ts` | OpenAI-compatible `listModels` and `chatCompletion` with injectable `fetch` |
| `lib/ai/generate.ts` | `generateText` using the default provider (server only; used by part 2) |
| `lib/settings.ts` | `getSettings`, `getPublicSettings`, `updateSettings` over the store |
| `lib/settings-actions.ts` | Server actions for the settings page |
| `lib/schemas.ts` | Add settings zod schemas |
| `lib/types.ts`, `lib/store.ts`, `lib/session.ts`, `lib/permissions.ts`, `lib/overview.ts`, `lib/tasks.ts`, `lib/actions.ts` | Wire settings into existing data flow |
| `app/(app)/settings/page.tsx` | Settings page |
| `components/settings/*.tsx` | Tabs shell, General form, Workflow form, AI providers panel, provider sheet |
| `components/app-sidebar.tsx`, `app/(app)/layout.tsx`, `components/site-header.tsx` | Settings nav item, company name, page title |

---

### Task 1: Test runner in the repo

The project has no test runner; the unit tests so far live in the session scratchpad. This task adds Node's built-in runner to the repo and moves the existing tests in.

**Files:**
- Create: `tests/register.mjs`
- Create: `tests/tasks.test.ts`, `tests/analytics.test.ts`, `tests/reports.test.ts`, `tests/overview.test.ts`, `tests/permissions.test.ts`, `tests/attention.test.ts`, `tests/attachments.test.ts`
- Modify: `package.json` (scripts), `tsconfig.json` (exclude), `.gitignore`

**Interfaces:**
- Produces: `pnpm test` runs every `tests/**/*.test.ts`; tests import app code as `@/lib/...`.

- [ ] **Step 1: Write the resolve hook**

`tests/register.mjs`:

```js
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = root + specifier.slice(2)
      const file = [".ts", ".tsx"].map((ext) => base + ext).find(existsSync)
      if (file) return next(pathToFileURL(file).href, context)
    }
    return next(specifier, context)
  },
})
```

- [ ] **Step 2: Add the script and keep tests out of the app type check**

`package.json` scripts, add:

```json
"test": "node --import ./tests/register.mjs --test \"tests/**/*.test.ts\""
```

`tsconfig.json`: change `"exclude": ["node_modules"]` to `"exclude": ["node_modules", "tests"]`.

`.gitignore`: add a line `!.env.example` right after the `.env*` line, so the example file can be committed while real `.env*` files stay ignored.

- [ ] **Step 3: Move the existing tests**

Copy each file from `/private/tmp/claude-501/-Users-iboxlab-Test-tracking-system/0f65a0ff-ed35-43da-a6b7-ca201135e33a/scratchpad/*.test.ts` into `tests/`. In each, replace the absolute import `"/Users/iboxlab/Test/tracking-system/lib/<name>.ts"` with `"@/lib/<name>"`. In `attachments.test.ts`, replace `process.chdir(new URL("./cwd/", import.meta.url).pathname)` with:

```ts
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

process.chdir(mkdtempSync(path.join(tmpdir(), "tracksys-test-")))
```

and its dynamic import with `await import("@/lib/attachments")`.

- [ ] **Step 4: Run the suite**

Run: `pnpm test`
Expected: `ℹ pass 27`, `ℹ fail 0`.

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no output. If eslint reports issues in `tests/`, fix them in the test files (do not disable rules globally).

- [ ] **Step 6: Commit (amend the branch commit)**

```bash
git add tests package.json tsconfig.json .gitignore
git commit --amend -F <message file>
```

Message (rebuild cumulatively in every task; first version):

```
feat: settings-ai

commit message:
1. add the settings and ai providers design spec and plan
2. add a node test runner with the existing unit tests
```

---

### Task 2: Settings model and data wiring

Move company name, tagline and delay reasons into `settings`, upgrade old stores on load, and make the session carry only the public view.

**Files:**
- Create: `lib/settings-model.ts`, `tests/settings-model.test.ts`
- Modify: `lib/types.ts`, `lib/store.ts`, `lib/session.ts`, `lib/permissions.ts`, `lib/overview.ts`, `lib/actions.ts`, `app/(app)/dashboard/page.tsx`, `app/(app)/tasks/[id]/page.tsx`

**Interfaces:**
- Produces (from `lib/settings-model.ts`):
  - `interface GeneralSettings { companyName: string; tagline: string }`
  - `interface WorkflowSettings { delayReasons: string[]; attentionWindowDays: number }`
  - `interface AiProvider { id: string; name: string; endpoint: string; apiKeyEncrypted: string | null; apiKeyLast4: string | null; models: string[]; defaultModel: string | null }`
  - `interface AppSettings { general: GeneralSettings; workflow: WorkflowSettings; ai: { defaultProviderId: string | null; providers: AiProvider[] } }`
  - `type PublicAiProvider = Omit<AiProvider, "apiKeyEncrypted" | "apiKeyLast4"> & { hasApiKey: boolean; apiKeyHint: string | null }`
  - `interface PublicSettings { general: GeneralSettings; workflow: WorkflowSettings; ai: { defaultProviderId: string | null; providers: PublicAiProvider[] } }`
  - `const DEFAULT_ATTENTION_WINDOW_DAYS = 2`
  - `const PROVIDER_PRESETS: ReadonlyArray<{ id: "groq" | "gemini"; label: string; endpoint: string }>`
  - `function upgradeLegacySettings(raw: Record<string, unknown>): void`
  - `function toPublicSettings(settings: AppSettings): PublicSettings`
  - `interface ProviderChange { id?: string; name: string; endpoint: string; key: { action: "keep" } | { action: "set"; encrypted: string; last4: string }; models: string[]; defaultModel: string }`
  - `function applyProviderInput(settings: AppSettings, change: ProviderChange, newId: () => string): { ok: true; id: string } | { ok: false; error: string }`
  - `function removeProvider(settings: AppSettings, id: string): boolean`
  - `function setDefaultProvider(settings: AppSettings, id: string): boolean`
  - `function clearProviderKey(settings: AppSettings, id: string): boolean`
- Produces (from `lib/types.ts`): `TrackingData.settings: AppSettings`; `type PublicTrackingData = Omit<TrackingData, "settings"> & { settings: PublicSettings }`.
- Produces (from `lib/session.ts`): `Session.data` and `Session.all` are `PublicTrackingData`.

- [ ] **Step 1: Write the failing tests**

`tests/settings-model.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  applyProviderInput,
  clearProviderKey,
  removeProvider,
  setDefaultProvider,
  toPublicSettings,
  upgradeLegacySettings,
  type AppSettings,
} from "@/lib/settings-model"

function baseSettings(): AppSettings {
  return {
    general: { companyName: "Acme", tagline: "" },
    workflow: { delayReasons: ["Other"], attentionWindowDays: 2 },
    ai: { defaultProviderId: null, providers: [] },
  }
}

const change = {
  name: "Groq",
  endpoint: "https://api.groq.com/openai/v1",
  key: { action: "set" as const, encrypted: "iv:tag:data", last4: "abcd" },
  models: ["llama-3.3-70b-versatile"],
  defaultModel: "llama-3.3-70b-versatile",
}

test("upgradeLegacySettings moves meta and delay reasons into settings", () => {
  const raw: Record<string, unknown> = {
    meta: { company: "Security Partners Ltd", tagline: "Assign", system: "X" },
    delayReasons: ["Technical issue"],
  }
  upgradeLegacySettings(raw)
  assert.deepEqual(raw.settings, {
    general: { companyName: "Security Partners Ltd", tagline: "Assign" },
    workflow: { delayReasons: ["Technical issue"], attentionWindowDays: 2 },
    ai: { defaultProviderId: null, providers: [] },
  })
  assert.equal("delayReasons" in raw, false)
  assert.deepEqual(raw.meta, { system: "X" })
})

test("upgradeLegacySettings leaves existing settings alone", () => {
  const settings = baseSettings()
  const raw: Record<string, unknown> = { meta: {}, settings }
  upgradeLegacySettings(raw)
  assert.equal(raw.settings, settings)
})

test("toPublicSettings hides the encrypted key and shows a hint", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  const pub = toPublicSettings(settings)
  const provider = pub.ai.providers[0]
  assert.equal(provider.hasApiKey, true)
  assert.equal(provider.apiKeyHint, "••••abcd")
  assert.equal(JSON.stringify(pub).includes("iv:tag:data"), false)
  assert.equal("apiKeyLast4" in provider, false)
})

test("first provider becomes the default", () => {
  const settings = baseSettings()
  const result = applyProviderInput(settings, change, () => "p1")
  assert.deepEqual(result, { ok: true, id: "p1" })
  assert.equal(settings.ai.defaultProviderId, "p1")
})

test("editing with a blank key keeps the stored key", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(
    settings,
    { ...change, id: "p1", name: "Groq Cloud", key: { action: "keep" } },
    () => "unused"
  )
  const [provider] = settings.ai.providers
  assert.equal(provider.name, "Groq Cloud")
  assert.equal(provider.apiKeyEncrypted, "iv:tag:data")
  assert.equal(provider.apiKeyLast4, "abcd")
})

test("provider names are unique ignoring case", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  const result = applyProviderInput(
    settings,
    { ...change, name: "groq" },
    () => "p2"
  )
  assert.deepEqual(result, {
    ok: false,
    error: "A provider with this name already exists",
  })
})

test("editing an unknown provider fails", () => {
  const result = applyProviderInput(
    baseSettings(),
    { ...change, id: "missing" },
    () => "p1"
  )
  assert.deepEqual(result, { ok: false, error: "Provider not found" })
})

test("removing the default provider clears the default", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(settings, { ...change, name: "Gemini" }, () => "p2")
  assert.equal(removeProvider(settings, "p1"), true)
  assert.equal(settings.ai.defaultProviderId, null)
  assert.deepEqual(settings.ai.providers.map((p) => p.id), ["p2"])
})

test("removing another provider keeps the default", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(settings, { ...change, name: "Gemini" }, () => "p2")
  removeProvider(settings, "p2")
  assert.equal(settings.ai.defaultProviderId, "p1")
})

test("setDefaultProvider and clearProviderKey", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(settings, { ...change, name: "Gemini" }, () => "p2")
  assert.equal(setDefaultProvider(settings, "p2"), true)
  assert.equal(settings.ai.defaultProviderId, "p2")
  assert.equal(setDefaultProvider(settings, "missing"), false)
  assert.equal(clearProviderKey(settings, "p1"), true)
  assert.equal(settings.ai.providers[0].apiKeyEncrypted, null)
  assert.equal(settings.ai.providers[0].apiKeyLast4, null)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — `Cannot find module` for `@/lib/settings-model`.

- [ ] **Step 3: Implement `lib/settings-model.ts`**

```ts
export interface GeneralSettings {
  companyName: string
  tagline: string
}

export interface WorkflowSettings {
  delayReasons: string[]
  attentionWindowDays: number
}

export interface AiProvider {
  id: string
  name: string
  endpoint: string
  apiKeyEncrypted: string | null
  apiKeyLast4: string | null
  models: string[]
  defaultModel: string | null
}

export interface AppSettings {
  general: GeneralSettings
  workflow: WorkflowSettings
  ai: { defaultProviderId: string | null; providers: AiProvider[] }
}

export type PublicAiProvider = Omit<
  AiProvider,
  "apiKeyEncrypted" | "apiKeyLast4"
> & { hasApiKey: boolean; apiKeyHint: string | null }

export interface PublicSettings {
  general: GeneralSettings
  workflow: WorkflowSettings
  ai: { defaultProviderId: string | null; providers: PublicAiProvider[] }
}

export const DEFAULT_ATTENTION_WINDOW_DAYS = 2

export const PROVIDER_PRESETS = [
  { id: "groq", label: "Groq", endpoint: "https://api.groq.com/openai/v1" },
  {
    id: "gemini",
    label: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
] as const

// Stores written before settings existed keep company, tagline and delay reasons elsewhere.
export function upgradeLegacySettings(raw: Record<string, unknown>): void {
  if (raw.settings) return
  const meta = (raw.meta ?? {}) as Record<string, unknown>
  const settings: AppSettings = {
    general: {
      companyName: String(meta.company ?? "Company"),
      tagline: String(meta.tagline ?? ""),
    },
    workflow: {
      delayReasons: Array.isArray(raw.delayReasons)
        ? (raw.delayReasons as string[])
        : ["Other"],
      attentionWindowDays: DEFAULT_ATTENTION_WINDOW_DAYS,
    },
    ai: { defaultProviderId: null, providers: [] },
  }
  delete meta.company
  delete meta.tagline
  delete raw.delayReasons
  raw.settings = settings
}

export function toPublicSettings(settings: AppSettings): PublicSettings {
  return {
    general: { ...settings.general },
    workflow: {
      ...settings.workflow,
      delayReasons: [...settings.workflow.delayReasons],
    },
    ai: {
      defaultProviderId: settings.ai.defaultProviderId,
      providers: settings.ai.providers.map(
        ({ apiKeyEncrypted, apiKeyLast4, ...rest }) => ({
          ...rest,
          models: [...rest.models],
          hasApiKey: apiKeyEncrypted !== null,
          apiKeyHint: apiKeyLast4 ? `••••${apiKeyLast4}` : null,
        })
      ),
    },
  }
}

export interface ProviderChange {
  id?: string
  name: string
  endpoint: string
  key: { action: "keep" } | { action: "set"; encrypted: string; last4: string }
  models: string[]
  defaultModel: string
}

export function applyProviderInput(
  settings: AppSettings,
  change: ProviderChange,
  newId: () => string
): { ok: true; id: string } | { ok: false; error: string } {
  const { providers } = settings.ai
  const existing = change.id
    ? providers.find((p) => p.id === change.id)
    : undefined
  if (change.id && !existing) return { ok: false, error: "Provider not found" }

  const clash = providers.some(
    (p) =>
      p.id !== change.id && p.name.toLowerCase() === change.name.toLowerCase()
  )
  if (clash) {
    return { ok: false, error: "A provider with this name already exists" }
  }

  const provider: AiProvider = existing ?? {
    id: newId(),
    name: "",
    endpoint: "",
    apiKeyEncrypted: null,
    apiKeyLast4: null,
    models: [],
    defaultModel: null,
  }
  provider.name = change.name
  provider.endpoint = change.endpoint
  provider.models = [...change.models]
  provider.defaultModel = change.defaultModel
  if (change.key.action === "set") {
    provider.apiKeyEncrypted = change.key.encrypted
    provider.apiKeyLast4 = change.key.last4
  }

  if (!existing) providers.push(provider)
  settings.ai.defaultProviderId ??= provider.id
  return { ok: true, id: provider.id }
}

export function removeProvider(settings: AppSettings, id: string): boolean {
  const before = settings.ai.providers.length
  settings.ai.providers = settings.ai.providers.filter((p) => p.id !== id)
  if (settings.ai.defaultProviderId === id) settings.ai.defaultProviderId = null
  return settings.ai.providers.length < before
}

export function setDefaultProvider(settings: AppSettings, id: string): boolean {
  if (!settings.ai.providers.some((p) => p.id === id)) return false
  settings.ai.defaultProviderId = id
  return true
}

export function clearProviderKey(settings: AppSettings, id: string): boolean {
  const provider = settings.ai.providers.find((p) => p.id === id)
  if (!provider) return false
  provider.apiKeyEncrypted = null
  provider.apiKeyLast4 = null
  return true
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass (27 old + 10 new = 37).

- [ ] **Step 5: Wire settings into the data types**

`lib/types.ts`:
- Remove `company: string` and `tagline: string` from `interface Meta`.
- Remove `delayReasons: string[]` from `interface TrackingData`; add `settings: AppSettings`.
- Add at the top: `import type { AppSettings, PublicSettings } from "@/lib/settings-model"`.
- Add at the end:

```ts
export type PublicTrackingData = Omit<TrackingData, "settings"> & {
  settings: PublicSettings
}
```

`lib/store.ts`, inside `load()` right after the state is read (before the task loop):

```ts
    upgradeLegacySettings(state as unknown as Record<string, unknown>)
```

and import `upgradeLegacySettings` from `@/lib/settings-model`. Extend the existing upgrade comment to mention settings.

- [ ] **Step 6: Make the session public-only**

`lib/permissions.ts` — make `scopeData` generic:

```ts
type Scopable = Pick<TrackingData, "employees" | "tasks" | "dailyReports">

export function scopeData<T extends Scopable>(data: T, user: Employee): T {
```

(body unchanged).

`lib/session.ts`:
- `listUsers(data: Pick<TrackingData, "employees">)`.
- `Session.data` and `Session.all` typed `PublicTrackingData`.
- In `getSession`, after `const raw = await getData()`:

```ts
  const all: PublicTrackingData = {
    ...raw,
    settings: toPublicSettings(raw.settings),
  }
```

and use `all` for `listUsers` and `scopeData`. Import `toPublicSettings` and `PublicTrackingData`.

- Add:

```ts
export async function requireMD(): Promise<Session> {
  const session = await getSession()
  if (session.user.role !== "MD") {
    redirect(isManagement(session.user) ? "/dashboard" : "/employee")
  }
  return session
}
```

`lib/overview.ts`: change `buildOverview(data: TrackingData, ...)` to `buildOverview(data: Pick<TrackingData, "tasks" | "employees" | "dailyReports">, ...)`.

`lib/actions.ts`: change `findTask(data: TrackingData, id)` to `findTask(data: Pick<TrackingData, "tasks">, id)`; in `recordDelayReason`, replace `data.delayReasons` with `data.settings.workflow.delayReasons`.

`app/(app)/dashboard/page.tsx`: replace `` `${data.meta.company} · ${data.meta.tagline}` `` with `` `${data.settings.general.companyName} · ${data.settings.general.tagline}` ``.

`app/(app)/tasks/[id]/page.tsx`: replace `delayReasons={data.delayReasons}` with `delayReasons={data.settings.workflow.delayReasons}`.

- [ ] **Step 7: Verify the app still builds and renders**

Run: `npx tsc --noEmit && npx eslint . && pnpm test && npx next build`
Expected: no type or lint errors, all tests pass, build succeeds.

Start `npx next start -p 3100`, then with no `.data` directory:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/dashboard` → `200`, and `curl -s http://localhost:3100/dashboard | grep -o "Security Partners Ltd" | head -1` → `Security Partners Ltd`.

Stop the server and delete `.data`.

- [ ] **Step 8: Commit (amend)**

Add to the message: `3. move company, tagline and delay reasons into settings with an upgrade for older data`.

---

### Task 3: Secret encryption

**Files:**
- Create: `lib/crypto.ts`, `tests/crypto.test.ts`, `.env.example`

**Interfaces:**
- Produces: `class SecretError extends Error`; `hasSettingsSecret(): boolean`; `encryptSecret(plain: string): string`; `decryptSecret(stored: string): string` (throws `SecretError`).

- [ ] **Step 1: Write the failing tests**

`tests/crypto.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  decryptSecret,
  encryptSecret,
  hasSettingsSecret,
  SecretError,
} from "@/lib/crypto"

const SECRET = "test-secret-at-least-16-chars"

test("round trip with a fresh IV each time", () => {
  process.env.SETTINGS_SECRET = SECRET
  const a = encryptSecret("gsk_live_key_1234")
  const b = encryptSecret("gsk_live_key_1234")
  assert.notEqual(a, b)
  assert.equal(a.split(":").length, 3)
  assert.equal(a.includes("gsk_live_key_1234"), false)
  assert.equal(decryptSecret(a), "gsk_live_key_1234")
})

test("a different secret cannot decrypt", () => {
  process.env.SETTINGS_SECRET = SECRET
  const stored = encryptSecret("key")
  process.env.SETTINGS_SECRET = "another-secret-16-chars-long"
  assert.throws(() => decryptSecret(stored), SecretError)
})

test("tampered ciphertext is rejected", () => {
  process.env.SETTINGS_SECRET = SECRET
  const [iv, tag, data] = encryptSecret("key").split(":")
  const flipped = Buffer.from(data, "base64")
  flipped[0] ^= 1
  assert.throws(
    () => decryptSecret([iv, tag, flipped.toString("base64")].join(":")),
    SecretError
  )
})

test("missing or short secret", () => {
  delete process.env.SETTINGS_SECRET
  assert.equal(hasSettingsSecret(), false)
  assert.throws(() => encryptSecret("key"), SecretError)
  process.env.SETTINGS_SECRET = "short"
  assert.equal(hasSettingsSecret(), false)
  process.env.SETTINGS_SECRET = SECRET
  assert.equal(hasSettingsSecret(), true)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test` — Expected: FAIL, module `@/lib/crypto` not found.

- [ ] **Step 3: Implement `lib/crypto.ts`**

```ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

export class SecretError extends Error {}

const MIN_SECRET_LENGTH = 16
const UNREADABLE = "Stored API key cannot be read — enter it again"

export function hasSettingsSecret(): boolean {
  return (process.env.SETTINGS_SECRET ?? "").length >= MIN_SECRET_LENGTH
}

function key(): Buffer {
  if (!hasSettingsSecret()) {
    throw new SecretError(
      "SETTINGS_SECRET is not set. Add it to .env.local (at least 16 characters) and restart the server."
    )
  }
  return createHash("sha256").update(process.env.SETTINGS_SECRET!).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64"))
    .join(":")
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(":")
  if (parts.length !== 3) throw new SecretError(UNREADABLE)
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64"))
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    )
  } catch (error) {
    if (error instanceof SecretError) throw error
    throw new SecretError(UNREADABLE)
  }
}
```

- [ ] **Step 4: Run tests** — `pnpm test`, Expected: all pass.

- [ ] **Step 5: Document the secret**

`.env.example`:

```
# Encrypts AI provider API keys at rest. At least 16 characters.
# Generate one with: openssl rand -base64 32
SETTINGS_SECRET=
```

Run: `git check-ignore -v .env.example` → no output (the `!.env.example` rule from Task 1 makes it tracked).

- [ ] **Step 6: Type check, lint, commit (amend)** — add `4. encrypt ai provider api keys at rest with SETTINGS_SECRET`.

---

### Task 4: Endpoint guard

**Files:**
- Create: `lib/ai/endpoint.ts`, `tests/endpoint.test.ts`

**Interfaces:**
- Produces: `isPrivateAddress(ip: string): boolean`; `type Lookup = (host: string) => Promise<{ address: string }[]>`; `checkEndpoint(raw: string, lookupFn?: Lookup): Promise<{ ok: true; url: string } | { ok: false; error: string }>` — `url` has no trailing slash.

- [ ] **Step 1: Write the failing tests**

`tests/endpoint.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { checkEndpoint, isPrivateAddress } from "@/lib/ai/endpoint"

const publicLookup = async () => [{ address: "104.18.2.1" }]
const privateLookup = async () => [{ address: "10.0.0.5" }]

test("isPrivateAddress", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "192.168.1.1", "172.16.0.1",
    "172.31.255.255", "169.254.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1",
    "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip)
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "104.18.2.1", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip)
  }
})

test("accepts https and strips the trailing slash", async () => {
  assert.deepEqual(
    await checkEndpoint("https://api.groq.com/openai/v1/", publicLookup),
    { ok: true, url: "https://api.groq.com/openai/v1" }
  )
})

test("rejects http, bad URLs and private hosts", async () => {
  assert.deepEqual(await checkEndpoint("http://api.groq.com", publicLookup), {
    ok: false,
    error: "The endpoint must use https://",
  })
  assert.deepEqual(await checkEndpoint("not a url", publicLookup), {
    ok: false,
    error: "Enter a valid URL",
  })
  for (const url of ["https://localhost/v1", "https://api.localhost",
    "https://127.0.0.1/v1", "https://[::1]/v1"]) {
    const result = await checkEndpoint(url, publicLookup)
    assert.equal(result.ok, false, url)
  }
  const resolvedPrivate = await checkEndpoint("https://internal.example", privateLookup)
  assert.equal(resolvedPrivate.ok, false)
})

test("unresolvable host", async () => {
  const result = await checkEndpoint("https://nope.example", async () => {
    throw new Error("ENOTFOUND")
  })
  assert.deepEqual(result, { ok: false, error: "Could not resolve the endpoint host" })
})
```

- [ ] **Step 2: Run to verify failure** — `pnpm test`, module not found.

- [ ] **Step 3: Implement `lib/ai/endpoint.ts`**

```ts
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

export type Lookup = (host: string) => Promise<{ address: string }[]>

const PRIVATE_HOST = "Endpoints on local or private networks are not allowed"

const defaultLookup: Lookup = (host) => lookup(host, { all: true })

export function isPrivateAddress(ip: string): boolean {
  const value = ip.toLowerCase()
  if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7))
  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    )
  }
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  )
}

export async function checkEndpoint(
  raw: string,
  lookupFn: Lookup = defaultLookup
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, error: "Enter a valid URL" }
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "The endpoint must use https://" }
  }

  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, error: PRIVATE_HOST }
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookupFn(host).catch(() => [])
  if (addresses.length === 0) {
    return { ok: false, error: "Could not resolve the endpoint host" }
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    return { ok: false, error: PRIVATE_HOST }
  }
  return { ok: true, url: url.toString().replace(/\/+$/, "") }
}
```

- [ ] **Step 4: Run tests** — all pass.
- [ ] **Step 5: Type check, lint, commit (amend)** — add `5. reject non-https and private-network ai endpoints`.

---

### Task 5: OpenAI-compatible client and `generateText`

**Files:**
- Create: `lib/ai/client.ts`, `lib/ai/generate.ts`, `tests/ai-client.test.ts`

**Interfaces:**
- Consumes: `checkEndpoint` (Task 4), `decryptSecret`, `SecretError` (Task 3), `getSettings` (Task 6 — `generate.ts` only; write `generate.ts` in this task, it compiles once Task 6 lands, so do Task 6 Step 3 first if executing out of order).
- Produces:
  - `class AiError extends Error`
  - `type FetchLike = (input: string, init: RequestInit) => Promise<Response>`
  - `listModels(endpoint: string, apiKey: string, fetchImpl?: FetchLike): Promise<string[]>`
  - `chatCompletion(endpoint: string, apiKey: string, request: { model: string; messages: { role: "system" | "user"; content: string }[] }, fetchImpl?: FetchLike): Promise<string>`
  - `generateText(input: { prompt: string; system?: string; model?: string }): Promise<string>` (from `lib/ai/generate.ts`)

- [ ] **Step 1: Write the failing tests**

`tests/ai-client.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { AiError, chatCompletion, listModels } from "@/lib/ai/client"

const KEY = "gsk_secret_value_9876"

function stub(status: number, body: unknown, seen: { url?: string; init?: RequestInit } = {}) {
  return async (url: string, init: RequestInit) => {
    seen.url = url
    seen.init = init
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
  }
}

test("listModels sends the key, strips Gemini prefixes, dedupes and sorts", async () => {
  const seen: { url?: string; init?: RequestInit } = {}
  const models = await listModels(
    "https://example.com/v1",
    KEY,
    stub(200, { data: [{ id: "models/gemini-2.0-flash" }, { id: "b-model" },
      { id: "gemini-2.0-flash" }, { name: "no-id" }] }, seen)
  )
  assert.deepEqual(models, ["b-model", "gemini-2.0-flash"])
  assert.equal(seen.url, "https://example.com/v1/models")
  assert.equal(new Headers(seen.init?.headers).get("authorization"), `Bearer ${KEY}`)
  assert.equal(seen.init?.redirect, "error")
})

test("401 and 403 mean the key was rejected", async () => {
  for (const status of [401, 403]) {
    await assert.rejects(listModels("https://e.com/v1", KEY, stub(status, {})), {
      message: "API key was rejected by the provider",
    })
  }
})

test("provider errors never echo the key", async () => {
  const error = await listModels(
    "https://e.com/v1",
    KEY,
    stub(500, { error: { message: `bad key ${KEY} for model` } })
  ).catch((e: unknown) => e)
  assert.ok(error instanceof AiError)
  assert.equal(error.message.includes(KEY), false)
  assert.match(error.message, /^Provider error \(500\)/)
})

test("network failure and bad shapes", async () => {
  await assert.rejects(
    listModels("https://e.com/v1", KEY, async () => { throw new TypeError("fetch failed") }),
    { message: "Could not reach the endpoint" }
  )
  await assert.rejects(listModels("https://e.com/v1", KEY, stub(200, "<html>")), {
    message: "The endpoint did not return an OpenAI-compatible response",
  })
  await assert.rejects(listModels("https://e.com/v1", KEY, stub(200, { models: [] })), {
    message: "The endpoint did not return an OpenAI-compatible response",
  })
})

test("chatCompletion posts messages and returns the first choice", async () => {
  const seen: { url?: string; init?: RequestInit } = {}
  const text = await chatCompletion(
    "https://e.com/v1",
    KEY,
    { model: "m", messages: [{ role: "user", content: "Hi" }] },
    stub(200, { choices: [{ message: { content: "Hello" } }] }, seen)
  )
  assert.equal(text, "Hello")
  assert.equal(seen.url, "https://e.com/v1/chat/completions")
  assert.equal(seen.init?.method, "POST")
  assert.deepEqual(JSON.parse(String(seen.init?.body)), {
    model: "m",
    messages: [{ role: "user", content: "Hi" }],
  })
})
```

- [ ] **Step 2: Run to verify failure** — module not found.

- [ ] **Step 3: Implement `lib/ai/client.ts`**

```ts
export class AiError extends Error {}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

const TIMEOUT_MS = 15_000
const NOT_COMPATIBLE = "The endpoint did not return an OpenAI-compatible response"

async function request(
  url: string,
  apiKey: string,
  init: RequestInit,
  fetchImpl: FetchLike
): Promise<unknown> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      ...init,
      // A redirect could point the server at an address checkEndpoint never saw.
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${apiKey}`,
      },
    })
  } catch {
    throw new AiError("Could not reach the endpoint")
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiError("API key was rejected by the provider")
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => String(body?.error?.message ?? ""))
      .catch(() => "")
    const safe = detail.split(apiKey).join("••••").slice(0, 120)
    throw new AiError(
      `Provider error (${response.status})${safe ? `: ${safe}` : ""}`
    )
  }
  try {
    return await response.json()
  } catch {
    throw new AiError(NOT_COMPATIBLE)
  }
}

export async function listModels(
  endpoint: string,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): Promise<string[]> {
  const body = await request(
    `${endpoint}/models`,
    apiKey,
    { method: "GET" },
    fetchImpl
  )
  const data = (body as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) throw new AiError(NOT_COMPATIBLE)
  const ids = data
    .map((model) => (model as { id?: unknown }).id)
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.replace(/^models\//, ""))
  return [...new Set(ids)].sort()
}

export async function chatCompletion(
  endpoint: string,
  apiKey: string,
  body: {
    model: string
    messages: { role: "system" | "user"; content: string }[]
  },
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const result = await request(
    `${endpoint}/chat/completions`,
    apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fetchImpl
  )
  const content = (
    result as { choices?: { message?: { content?: unknown } }[] } | null
  )?.choices?.[0]?.message?.content
  if (typeof content !== "string") throw new AiError(NOT_COMPATIBLE)
  return content
}
```

- [ ] **Step 4: Implement `lib/ai/generate.ts`**

```ts
import { chatCompletion, AiError } from "@/lib/ai/client"
import { checkEndpoint } from "@/lib/ai/endpoint"
import { decryptSecret, SecretError } from "@/lib/crypto"
import { getSettings } from "@/lib/settings"

export async function generateText(input: {
  prompt: string
  system?: string
  model?: string
}): Promise<string> {
  const { ai } = await getSettings()
  const provider = ai.providers.find((p) => p.id === ai.defaultProviderId)
  if (!provider) throw new AiError("No default AI provider is configured")
  const model = input.model ?? provider.defaultModel
  if (!model) throw new AiError("The default AI provider has no default model")
  if (!provider.apiKeyEncrypted) {
    throw new AiError("The default AI provider has no API key")
  }

  let apiKey: string
  try {
    apiKey = decryptSecret(provider.apiKeyEncrypted)
  } catch (error) {
    throw new AiError(error instanceof SecretError ? error.message : "API key error")
  }
  const endpoint = await checkEndpoint(provider.endpoint)
  if (!endpoint.ok) throw new AiError(endpoint.error)

  return chatCompletion(endpoint.url, apiKey, {
    model,
    messages: [
      ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
      { role: "user" as const, content: input.prompt },
    ],
  })
}
```

- [ ] **Step 5: Run tests** — `pnpm test`, all pass. (`generate.ts` is type-checked in Task 6 once `lib/settings.ts` exists.)
- [ ] **Step 6: Lint, commit (amend)** — add `6. add an openai-compatible ai client with model listing and text generation`.

---

### Task 6: Settings server layer, schemas and actions

**Files:**
- Create: `lib/settings.ts`, `lib/settings-actions.ts`, `tests/settings-schemas.test.ts`
- Modify: `lib/schemas.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - `lib/settings.ts`: `getSettings(): Promise<AppSettings>`, `getPublicSettings(): Promise<PublicSettings>`, `updateSettings<T>(fn: (s: AppSettings) => T): Promise<T>`
  - `lib/schemas.ts`: `generalSettingsSchema`, `GeneralSettingsValues`; `workflowSettingsSchema`, `WorkflowSettingsValues`; `providerSchema`, `ProviderValues` (`{ id?: string; name: string; endpoint: string; apiKey: string; models: string[]; defaultModel: string }`); `fetchModelsSchema`, `FetchModelsValues` (`{ providerId?: string; endpoint: string; apiKey: string }`)
  - `lib/settings-actions.ts` (all return `SettingsResult = { ok: boolean; error?: string; id?: string; models?: string[] }`): `saveGeneralSettings(values)`, `saveWorkflowSettings(values)`, `saveProvider(values)`, `deleteProvider(id)`, `makeDefaultProvider(id)`, `removeProviderKey(id)`, `fetchProviderModels(values)`

- [ ] **Step 1: Write failing schema tests**

`tests/settings-schemas.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  generalSettingsSchema,
  providerSchema,
  workflowSettingsSchema,
} from "@/lib/schemas"

const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? null : r.error!.issues[0].message

test("general settings", () => {
  assert.equal(generalSettingsSchema.safeParse({ companyName: " ", tagline: "" }).success, false)
  assert.equal(generalSettingsSchema.safeParse({ companyName: "Acme", tagline: "" }).success, true)
})

test("workflow settings", () => {
  const ok = { delayReasons: ["Other"], attentionWindowDays: 2 }
  assert.equal(workflowSettingsSchema.safeParse(ok).success, true)
  assert.equal(firstError(workflowSettingsSchema.safeParse({ ...ok, delayReasons: [] })),
    "Keep at least one delay reason")
  assert.equal(firstError(workflowSettingsSchema.safeParse({ ...ok, delayReasons: ["Other", "other"] })),
    "Delay reasons must be unique")
  assert.equal(workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: 15 }).success, false)
  assert.equal(workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: 1.5 }).success, false)
  assert.equal(workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: Number.NaN }).success, false)
})

test("provider", () => {
  const ok = {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1",
    apiKey: "",
    models: ["a", "b"],
    defaultModel: "a",
  }
  assert.equal(providerSchema.safeParse(ok).success, true)
  assert.equal(firstError(providerSchema.safeParse({ ...ok, endpoint: "http://x.com" })),
    "The endpoint must use https://")
  assert.equal(firstError(providerSchema.safeParse({ ...ok, models: [] })),
    "Add at least one model")
  assert.equal(firstError(providerSchema.safeParse({ ...ok, defaultModel: "c" })),
    "Choose one of the selected models")
})
```

- [ ] **Step 2: Run to verify failure** — schemas not exported.

- [ ] **Step 3: Add schemas to `lib/schemas.ts`**

```ts
const httpsUrl = z
  .string()
  .trim()
  .min(1, "Enter the API endpoint")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:"
    } catch {
      return false
    }
  }, "The endpoint must use https://")

export const generalSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(80),
  tagline: optionalText(160),
})
export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>

export const workflowSettingsSchema = z.object({
  delayReasons: z
    .array(z.string().trim().min(1, "Reason cannot be empty").max(80))
    .min(1, "Keep at least one delay reason")
    .refine(
      (list) => new Set(list.map((r) => r.toLowerCase())).size === list.length,
      "Delay reasons must be unique"
    ),
  attentionWindowDays: z
    .number({ error: "Enter a whole number of days" })
    .int("Enter a whole number of days")
    .min(1, "At least 1 day")
    .max(14, "At most 14 days"),
})
export type WorkflowSettingsValues = z.infer<typeof workflowSettingsSchema>

export const providerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Name is required").max(40),
    endpoint: httpsUrl,
    apiKey: z.string().trim().max(500),
    models: z.array(z.string().trim().min(1)).min(1, "Add at least one model"),
    defaultModel: z.string().min(1, "Choose a default model"),
  })
  .refine((v) => v.models.includes(v.defaultModel), {
    path: ["defaultModel"],
    message: "Choose one of the selected models",
  })
export type ProviderValues = z.infer<typeof providerSchema>

export const fetchModelsSchema = z.object({
  providerId: z.string().optional(),
  endpoint: httpsUrl,
  apiKey: z.string().trim().max(500),
})
export type FetchModelsValues = z.infer<typeof fetchModelsSchema>
```

- [ ] **Step 4: Run tests** — all pass.

- [ ] **Step 5: Implement `lib/settings.ts`**

```ts
import { toPublicSettings, type AppSettings, type PublicSettings } from "@/lib/settings-model"
import { getData, mutate } from "@/lib/store"

// The only module that reads or writes settings; swap its internals for Postgres.
export async function getSettings(): Promise<AppSettings> {
  return (await getData()).settings
}

export async function getPublicSettings(): Promise<PublicSettings> {
  return toPublicSettings(await getSettings())
}

export async function updateSettings<T>(fn: (settings: AppSettings) => T): Promise<T> {
  return mutate((data) => fn(data.settings))
}
```

- [ ] **Step 6: Implement `lib/settings-actions.ts`**

```ts
"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { AiError, listModels } from "@/lib/ai/client"
import { checkEndpoint } from "@/lib/ai/endpoint"
import { decryptSecret, encryptSecret, SecretError } from "@/lib/crypto"
import {
  fetchModelsSchema,
  generalSettingsSchema,
  providerSchema,
  workflowSettingsSchema,
  type FetchModelsValues,
  type GeneralSettingsValues,
  type ProviderValues,
  type WorkflowSettingsValues,
} from "@/lib/schemas"
import { getSession } from "@/lib/session"
import { getSettings, updateSettings } from "@/lib/settings"
import {
  applyProviderInput,
  clearProviderKey,
  removeProvider,
  setDefaultProvider,
  type ProviderChange,
} from "@/lib/settings-model"

export interface SettingsResult {
  ok: boolean
  error?: string
  id?: string
  models?: string[]
}

const NOT_ALLOWED: SettingsResult = { ok: false, error: "Only the Managing Director can change settings." }

async function isMD(): Promise<boolean> {
  return (await getSession()).user.role === "MD"
}

function parse<T>(schema: z.ZodType<T>, values: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(values)
  return result.success ? { data: result.data } : { error: result.error.issues[0]?.message ?? "Invalid input" }
}

function done(): SettingsResult {
  revalidatePath("/", "layout")
  return { ok: true }
}

function message(error: unknown): string {
  return error instanceof AiError || error instanceof SecretError ? error.message : "Something went wrong"
}

export async function saveGeneralSettings(values: GeneralSettingsValues): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(generalSettingsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  await updateSettings((s) => { s.general = parsed.data })
  return done()
}

export async function saveWorkflowSettings(values: WorkflowSettingsValues): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(workflowSettingsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  await updateSettings((s) => { s.workflow = parsed.data })
  return done()
}

export async function saveProvider(values: ProviderValues): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(providerSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  const input = parsed.data

  const endpoint = await checkEndpoint(input.endpoint)
  if (!endpoint.ok) return { ok: false, error: endpoint.error }

  let key: ProviderChange["key"] = { action: "keep" }
  if (input.apiKey) {
    try {
      key = { action: "set", encrypted: encryptSecret(input.apiKey), last4: input.apiKey.slice(-4) }
    } catch (error) {
      return { ok: false, error: message(error) }
    }
  }

  const result = await updateSettings((s) =>
    applyProviderInput(
      s,
      { id: input.id, name: input.name, endpoint: endpoint.url, key, models: input.models, defaultModel: input.defaultModel },
      randomUUID
    )
  )
  if (!result.ok) return result
  revalidatePath("/", "layout")
  return { ok: true, id: result.id }
}

export async function deleteProvider(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const removed = await updateSettings((s) => removeProvider(s, id))
  return removed ? done() : { ok: false, error: "Provider not found" }
}

export async function makeDefaultProvider(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const changed = await updateSettings((s) => setDefaultProvider(s, id))
  return changed ? done() : { ok: false, error: "Provider not found" }
}

export async function removeProviderKey(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const changed = await updateSettings((s) => clearProviderKey(s, id))
  return changed ? done() : { ok: false, error: "Provider not found" }
}

export async function fetchProviderModels(values: FetchModelsValues): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(fetchModelsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  const { providerId, apiKey: typedKey } = parsed.data

  const endpoint = await checkEndpoint(parsed.data.endpoint)
  if (!endpoint.ok) return { ok: false, error: endpoint.error }

  try {
    let apiKey = typedKey
    if (!apiKey && providerId) {
      const stored = (await getSettings()).ai.providers.find((p) => p.id === providerId)?.apiKeyEncrypted
      if (stored) apiKey = decryptSecret(stored)
    }
    if (!apiKey) return { ok: false, error: "Enter the API key to fetch models" }
    return { ok: true, models: await listModels(endpoint.url, apiKey) }
  } catch (error) {
    return { ok: false, error: message(error) }
  }
}
```

- [ ] **Step 7: Verify** — `npx tsc --noEmit && npx eslint . && pnpm test` all clean. Run Prettier on the touched files only.
- [ ] **Step 8: Commit (amend)** — add `7. add md-only settings actions with zod validation`.

---

### Task 7: Settings page with General and Workflow tabs

**Files:**
- Create: `app/(app)/settings/page.tsx`, `components/settings/settings-tabs.tsx`, `components/settings/general-settings-form.tsx`, `components/settings/workflow-settings-form.tsx`
- Modify: `components/app-sidebar.tsx`, `app/(app)/layout.tsx`, `components/site-header.tsx`, `lib/tasks.ts`, `tests/attention.test.ts`, `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `requireMD` (Task 2), `saveGeneralSettings`, `saveWorkflowSettings` (Task 6), `PublicSettings` (Task 2).
- Produces: `needsAttention(tasks: Task[], today: string, windowDays?: number, limit?: number): Task[]` (default window `DEFAULT_ATTENTION_WINDOW_DAYS`); `SettingsTabs({ tab, general, workflow, ai }: { tab: "general" | "workflow" | "ai"; general: ReactNode; workflow: ReactNode; ai: ReactNode })`.

- [ ] **Step 1: Failing test for the attention window**

Append to `tests/attention.test.ts`:

```ts
test("window length is configurable", () => {
  const tasks = [mk("d3", "pending", "2026-10-09"), mk("d5", "pending", "2026-10-11")]
  assert.deepEqual(needsAttention(tasks, "2026-10-06", 3).map((t) => t.id), ["d3"])
  assert.deepEqual(needsAttention(tasks, "2026-10-06", 5).map((t) => t.id), ["d3", "d5"])
})
```

Run `pnpm test` → FAIL (third argument is currently `limit`).

- [ ] **Step 2: Change `needsAttention`**

In `lib/tasks.ts`:

```ts
export function needsAttention(
  tasks: Task[],
  today: string,
  windowDays = DEFAULT_ATTENTION_WINDOW_DAYS,
  limit = 6
): Task[] {
  const soon = addDays(today, windowDays)
```

Import `DEFAULT_ATTENTION_WINDOW_DAYS` from `@/lib/settings-model`. In `tests/attention.test.ts` change the existing `needsAttention(tasks, "2026-10-06", 1)` limit call to `needsAttention(tasks, "2026-10-06", 2, 1)`. Run `pnpm test` → PASS.

In `app/(app)/dashboard/page.tsx`:

```ts
  const windowDays = data.settings.workflow.attentionWindowDays
  const attention = needsAttention(data.tasks, today, windowDays)
```

and the card description: `` `Overdue work, then open tasks due within ${windowDays} day${windowDays === 1 ? "" : "s"}` ``.

- [ ] **Step 3: Tabs shell**

`components/settings/settings-tabs.tsx`:

```tsx
"use client"

import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type SettingsTab = "general" | "workflow" | "ai"

export function SettingsTabs({
  tab,
  general,
  workflow,
  ai,
}: {
  tab: SettingsTab
  general: ReactNode
  workflow: ReactNode
  ai: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => router.replace(`${pathname}?tab=${value}`, { scroll: false })}
    >
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
        <TabsTrigger value="ai">AI</TabsTrigger>
      </TabsList>
      <TabsContent value="general">{general}</TabsContent>
      <TabsContent value="workflow">{workflow}</TabsContent>
      <TabsContent value="ai">{ai}</TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 4: General form**

`components/settings/general-settings-form.tsx` — react-hook-form + `generalSettingsSchema`, fields `companyName` (Input) and `tagline` (Input), each a `Controller` → `Field data-invalid` / `FieldLabel` / control with `aria-invalid` / `FieldError`, root `FieldError`, submit "Save" (`isSubmitting` → "Saving…"). On success call `form.reset(values)` and show `<p className="text-sm text-muted-foreground">Saved.</p>` while `form.formState.isSubmitSuccessful && !form.formState.isDirty`. On failure `form.setError("root", { message })`. Wrap in a `Card` titled "General" with description "Company details shown across the app". Props: `{ defaultValues: GeneralSettingsValues }`.

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { generalSettingsSchema, type GeneralSettingsValues } from "@/lib/schemas"
import { saveGeneralSettings } from "@/lib/settings-actions"

export function GeneralSettingsForm({ defaultValues }: { defaultValues: GeneralSettingsValues }) {
  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues,
  })
  const { isSubmitting, isSubmitSuccessful, isDirty } = form.formState

  async function onSubmit(values: GeneralSettingsValues) {
    const result = await saveGeneralSettings(values)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Company details shown across the app</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="companyName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="companyName">Company name</FieldLabel>
                  <Input {...field} id="companyName" aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="tagline"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
                  <Input {...field} id="tagline" aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <FieldError errors={[form.formState.errors.root]} />
            <Field orientation="horizontal">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
              {isSubmitSuccessful && !isDirty ? (
                <p className="text-sm text-muted-foreground">Saved.</p>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Workflow form**

`components/settings/workflow-settings-form.tsx`, props `{ defaultValues: WorkflowSettingsValues }`. Card "Workflow", description "Delay reasons and the Needs Attention window". Two controllers:

- `delayReasons` (`Controller`): render the current list as rows `<span className="flex-1 text-sm">{reason}</span>` + ghost icon button (`Delete02Icon`, `aria-label={`Remove ${reason}`}`) calling `field.onChange(field.value.filter((_, j) => j !== i))`. Below, an `Input` with local state `draft` and an outline button "Add"; pressing Enter in the input or clicking Add calls `field.onChange([...field.value, draft.trim()])` when `draft.trim()` is non-empty, then clears `draft`. Errors: list-level errors ("Keep at least one delay reason", "Delay reasons must be unique") arrive on `fieldState.error`; per-item errors arrive as an array on `form.formState.errors.delayReasons`. Render `<FieldError errors={Array.isArray(itemErrors) ? itemErrors : [fieldState.error]} />` with `const itemErrors = form.formState.errors.delayReasons`.
- `attentionWindowDays` (`Controller`): `Input type="number" min={1} max={14} step={1} className="w-24"`, `value={Number.isNaN(field.value) ? "" : field.value}`, `onChange={(e) => field.onChange(e.target.valueAsNumber)}`; description `<FieldDescription>Open tasks due within this many days appear in Needs Attention.</FieldDescription>`.

Submit and saved state as in Step 4, calling `saveWorkflowSettings`. Footer note `<FieldDescription>Removing a reason does not change tasks that already recorded it.</FieldDescription>`.

- [ ] **Step 6: Page**

`app/(app)/settings/page.tsx`:

```tsx
import { AiProvidersPanel } from "@/components/settings/ai-providers-panel"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import { SettingsTabs, type SettingsTab } from "@/components/settings/settings-tabs"
import { WorkflowSettingsForm } from "@/components/settings/workflow-settings-form"
import { AppHeader } from "@/components/app-header"
import { hasSettingsSecret } from "@/lib/crypto"
import { requireMD } from "@/lib/session"

const TABS: SettingsTab[] = ["general", "workflow", "ai"]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { data } = await requireMD()
  const { tab: requested } = await searchParams
  const tab = TABS.includes(requested as SettingsTab) ? (requested as SettingsTab) : "general"
  const { general, workflow, ai } = data.settings

  return (
    <>
      <AppHeader description="Company-wide configuration. Only the Managing Director can see this page." />
      <SettingsTabs
        tab={tab}
        general={<GeneralSettingsForm defaultValues={general} />}
        workflow={<WorkflowSettingsForm defaultValues={workflow} />}
        ai={<AiProvidersPanel settings={ai} secretConfigured={hasSettingsSecret()} />}
      />
    </>
  )
}
```

Until Task 8 exists, temporarily render `ai={<p className="text-sm text-muted-foreground">AI providers are set up in the next step.</p>}` and drop the `AiProvidersPanel` / `hasSettingsSecret` imports; Task 8 restores the lines above.

- [ ] **Step 7: Sidebar, header, company name**

`components/app-sidebar.tsx`:
- Add `Settings01Icon` to the icon import.
- Change the nav item type to include `access: "all" | "management" | "md"`; set existing items to `"management"` where `management: true` was used, `"all"` otherwise, and append `{ title: "Settings", url: "/settings", icon: Settings01Icon, access: "md" }`.
- Filter: `.filter((item) => item.access === "all" || (item.access === "management" && management) || (item.access === "md" && user.role === "MD"))`.
- New prop `companyName: string`; replace the hardcoded `Security Partners Ltd` text with `{companyName}`.

`app/(app)/layout.tsx`: `const { user, users, all } = await getSession()` and pass `companyName={all.settings.general.companyName}`.

`components/site-header.tsx`: add `"/settings": "Settings"` to `titles`.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx eslint . && pnpm test && npx next build`. Start the server (`npx next start -p 3100`), then:

```bash
for who in MD E1 E5; do printf "%s %s\n" $who "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: tracksys-user=$who" http://localhost:3100/settings)"; done
```

Expected: `MD 200`, `E1 307 …/dashboard`, `E5 307 …/employee`.

In the browser as MD: Settings appears in the sidebar; General save changes the sidebar company name and dashboard description; Workflow: add a reason, remove one, save, open an overdue task and see the new list in the Delay reason dropdown; set the window to 5 and see the Needs Attention description change; empty list and duplicate show errors; 15 shows "At most 14 days". As E1 the Settings item is hidden. Delete `.data` afterwards.

- [ ] **Step 9: Commit (amend)** — add `8. add an md-only settings page with general and workflow tabs`.

---

### Task 8: AI providers tab

**Files:**
- Create: `components/settings/ai-providers-panel.tsx`, `components/settings/provider-sheet.tsx`
- Modify: `app/(app)/settings/page.tsx` (restore the AI panel from Task 7 Step 6)

**Interfaces:**
- Consumes: `PublicSettings["ai"]`, `PublicAiProvider`, `PROVIDER_PRESETS` (Task 2); `saveProvider`, `deleteProvider`, `makeDefaultProvider`, `removeProviderKey`, `fetchProviderModels` (Task 6); `providerSchema`, `ProviderValues` (Task 6); `FormSelect` (`components/form-select.tsx`).
- Produces: `AiProvidersPanel({ settings, secretConfigured }: { settings: PublicSettings["ai"]; secretConfigured: boolean })`; `ProviderSheet({ provider, open, onOpenChange }: { provider: PublicAiProvider | null; open: boolean; onOpenChange: (open: boolean) => void })`.

- [ ] **Step 1: Provider sheet**

`components/settings/provider-sheet.tsx` (client). Behaviour:

- `useForm<ProviderValues>({ resolver: zodResolver(providerSchema), defaultValues })` where `defaultValues` comes from `provider` (`apiKey: ""`, `defaultModel: provider.defaultModel ?? ""`) or, for a new provider, `{ name: "", endpoint: "", apiKey: "", models: [], defaultModel: "" }`. Reset the form whenever the sheet opens (`useEffect` on `open`).
- Preset `FormSelect` (not part of the schema) with items `[...PROVIDER_PRESETS.map(p => ({ value: p.id, label: p.label })), { value: "custom", label: "Custom" }]`; choosing Groq or Gemini sets `endpoint` via `form.setValue("endpoint", preset.endpoint, { shouldValidate: true })` and fills `name` when empty.
- Fields (each `Controller` + `Field` / `FieldLabel` / `aria-invalid` / `FieldError`): Name (`Input`), API Endpoint (`Input`), API Key (`Input type="password" autoComplete="off"`, placeholder `provider?.apiKeyHint ?? "Paste the API key"`, `FieldDescription`: "Leave blank to keep the stored key." when `provider?.hasApiKey`).
- Models block:
  - "Fetch models" outline button (`Refresh01Icon`) calls `fetchProviderModels({ providerId: provider?.id, endpoint: form.getValues("endpoint"), apiKey: form.getValues("apiKey") })` in `useTransition`; on success store `available` (state) = union of returned models and current `models`; on error `form.setError("models", { message })`.
  - Checklist of `available` (falls back to current `models`): each row a `Checkbox` + label; toggling updates `models` via `field.onChange`. If a model is unticked and it is `defaultModel`, clear `defaultModel`.
  - Manual add: `Input` + "Add" button appends to `available` and ticks it.
  - `FieldError` for `models`.
- Default model `FormSelect` with items from the ticked `models`.
- Root `FieldError`. Footer: Save (`isSubmitting` → "Saving…"). On submit call `saveProvider({ ...values, id: provider?.id })`; on success `onOpenChange(false)`; on failure `form.setError("root", { message })`.
- Inside a `Sheet` with title "Add AI provider" / "Edit AI provider" and description "OpenAI-compatible endpoint, for example Groq or Gemini."

- [ ] **Step 2: Providers panel**

`components/settings/ai-providers-panel.tsx` (client):

- When `!secretConfigured`: a warning box (`border-amber-500/40 bg-amber-500/5`, `Alert02Icon`) reading "API keys cannot be saved until SETTINGS_SECRET is set. Add `SETTINGS_SECRET=<random 32+ characters>` to `.env.local` (generate one with `openssl rand -base64 32`) and restart the server."
- Header row: description "Providers used to generate text with AI" and "Add provider" button (`Add01Icon`) opening `ProviderSheet` with `provider = null`.
- Empty state: "No AI providers yet."
- One `Card` per provider: name + `Badge variant="success"` "Default" when `id === settings.defaultProviderId`; endpoint in `font-mono text-xs`; key line (`Key01Icon`) showing `apiKeyHint` or "No key"; models as `Badge variant="outline"` list with the default model marked "(default)". Buttons: Edit (opens sheet with this provider), "Set as default" (hidden when already default), "Remove key" (only when `hasApiKey`), Delete. Delete uses inline confirmation: first click turns the button into "Confirm delete" (`variant="destructive"`) for that card; a second click calls `deleteProvider`. Each action runs in `useTransition`; errors show in a `FieldError`-styled `<p role="alert">` on that card.

- [ ] **Step 3: Restore the page wiring** — put back the `AiProvidersPanel` / `hasSettingsSecret` lines from Task 7 Step 6.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint . && pnpm test && npx next build`.

Browser as MD, first **without** `SETTINGS_SECRET`: the warning shows; adding a provider with a key returns the SETTINGS_SECRET error; adding one without a key works.

Then create `.env.local` with `SETTINGS_SECRET=$(openssl rand -base64 32)`, restart, and:
- Add provider via the Groq preset with a fake key `gsk_fake_test_key_0000`; "Fetch models" shows "API key was rejected by the provider"; add a model by hand, choose it as default, save → card shows `••••0000`, model, Default badge.
- `grep -c "gsk_fake_test_key_0000" .data/data.json` → `0` (key stored encrypted).
- View page source / `curl -s -H "Cookie: tracksys-user=MD" http://localhost:3100/settings?tab=ai | grep -c "gsk_fake\|iv:"` → `0`.
- Edit the provider, change the name, leave the key blank, save → hint still `••••0000`.
- Add a second provider "Gemini" via preset; Set as default moves the badge; delete the default → no Default badge remains.
- Endpoint `http://example.com` and `https://localhost/v1` show their errors.
- Remove key → "No key".

A real model fetch needs the user's own Groq/Gemini key entered in the UI; ask the user to run that check.

Delete `.data` and the test `.env.local` afterwards unless the user wants to keep the secret (tell them).

- [ ] **Step 5: Commit (amend)** — add `9. add the ai providers tab with encrypted keys, presets and model fetching`.

---

### Task 9: Whole-feature review

- [ ] **Step 1:** `pnpm test && npx tsc --noEmit && npx eslint . && npx next build` — all clean.
- [ ] **Step 2:** Role matrix with the server running — MD, E1, E4, E5 against `/dashboard /tasks /reports /overview /settings` (expect previous behaviour everywhere; `/settings` 200 only for MD).
- [ ] **Step 3:** `git diff main --stat` — confirm only planned files changed; no `.env.local`, `.data`, or unrelated reformatting.
- [ ] **Step 4:** Check comments and Tailwind against the global rules (no arbitrary px; comments only for non-obvious why).
- [ ] **Step 5:** Final amend with the full numbered message (items 1–9).
