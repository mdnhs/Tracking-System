import assert from "node:assert/strict"
import { test } from "node:test"

import {
  applyProviderInput,
  clearProviderKey,
  pickKeySource,
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

test("upgradeLegacySettings repairs a legacy delay reason list", () => {
  const empty: Record<string, unknown> = { delayReasons: [] }
  upgradeLegacySettings(empty)
  assert.deepEqual((empty.settings as AppSettings).workflow.delayReasons, [
    "Other",
  ])

  const messy: Record<string, unknown> = {
    delayReasons: ["Waiting", 42, "", "  ", "Other", "waiting"],
  }
  upgradeLegacySettings(messy)
  assert.deepEqual((messy.settings as AppSettings).workflow.delayReasons, [
    "Waiting",
    "Other",
  ])
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

test("changing the endpoint with a blank key is rejected", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  const result = applyProviderInput(
    settings,
    {
      ...change,
      id: "p1",
      endpoint: "https://attacker.example/v1",
      key: { action: "keep" },
    },
    () => "unused"
  )
  assert.deepEqual(result, {
    ok: false,
    error: "Enter the API key to use a new endpoint",
  })
  assert.equal(settings.ai.providers[0].endpoint, "https://api.groq.com/openai/v1")
})

test("changing the endpoint with a new key is allowed", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  const result = applyProviderInput(
    settings,
    {
      ...change,
      id: "p1",
      endpoint: "https://other.example/v1",
      key: { action: "set", encrypted: "new", last4: "wxyz" },
    },
    () => "unused"
  )
  assert.deepEqual(result, { ok: true, id: "p1" })
  assert.equal(settings.ai.providers[0].endpoint, "https://other.example/v1")
  assert.equal(settings.ai.providers[0].apiKeyEncrypted, "new")
})

test("changing the endpoint is allowed when no key is stored", () => {
  const settings = baseSettings()
  applyProviderInput(
    settings,
    { ...change, key: { action: "keep" } },
    () => "p1"
  )
  const result = applyProviderInput(
    settings,
    { ...change, id: "p1", endpoint: "https://other.example/v1" },
    () => "unused"
  )
  assert.deepEqual(result, { ok: true, id: "p1" })
  assert.equal(settings.ai.providers[0].endpoint, "https://other.example/v1")
})

test("pickKeySource ties the stored key to its endpoint", () => {
  const provider = {
    endpoint: "https://api.groq.com/openai/v1",
    apiKeyEncrypted: "enc",
  }
  assert.deepEqual(pickKeySource(provider, provider.endpoint, ""), {
    ok: true,
    kind: "stored",
    encrypted: "enc",
  })
  assert.deepEqual(
    pickKeySource(provider, "https://other.example/v1", ""),
    { ok: false, error: "Enter the API key to use a new endpoint" }
  )
  assert.deepEqual(pickKeySource(provider, "https://other.example/v1", "typed"), {
    ok: true,
    kind: "typed",
    key: "typed",
  })
  assert.deepEqual(pickKeySource(undefined, "https://x.example/v1", ""), {
    ok: false,
    error: "Enter the API key to fetch models",
  })
  assert.deepEqual(
    pickKeySource({ endpoint: "https://x.example/v1", apiKeyEncrypted: null }, "https://x.example/v1", ""),
    { ok: false, error: "Enter the API key to fetch models" }
  )
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
  assert.deepEqual(
    settings.ai.providers.map((p) => p.id),
    ["p2"]
  )
})

test("editing after the default was deleted keeps default null", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(settings, { ...change, name: "Gemini" }, () => "p2")
  removeProvider(settings, "p1")
  assert.equal(settings.ai.defaultProviderId, null)
  applyProviderInput(
    settings,
    { ...change, id: "p2", name: "Gemini Cloud", key: { action: "keep" } },
    () => "unused"
  )
  assert.equal(settings.ai.defaultProviderId, null)
})

test("adding a provider after the default was deleted keeps default null", () => {
  const settings = baseSettings()
  applyProviderInput(settings, change, () => "p1")
  applyProviderInput(settings, { ...change, name: "Gemini" }, () => "p2")
  removeProvider(settings, "p1")
  applyProviderInput(settings, { ...change, name: "Mistral" }, () => "p3")
  assert.equal(settings.ai.defaultProviderId, null)
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
