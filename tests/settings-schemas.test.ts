import assert from "node:assert/strict"
import { test } from "node:test"

import {
  fetchModelsSchema,
  generalSettingsSchema,
  providerSchema,
  workflowSettingsSchema,
} from "@/lib/schemas"

const firstError = (r: {
  success: boolean
  error?: { issues: { message: string }[] }
}) => (r.success ? null : r.error!.issues[0].message)

test("general settings", () => {
  assert.equal(
    generalSettingsSchema.safeParse({ companyName: " ", tagline: "" }).success,
    false
  )
  assert.equal(
    generalSettingsSchema.safeParse({ companyName: "Acme", tagline: "" })
      .success,
    true
  )
})

test("workflow settings", () => {
  const ok = { delayReasons: ["Other"], attentionWindowDays: 2 }
  assert.equal(workflowSettingsSchema.safeParse(ok).success, true)
  assert.equal(
    firstError(workflowSettingsSchema.safeParse({ ...ok, delayReasons: [] })),
    "Keep at least one delay reason"
  )
  assert.equal(
    firstError(
      workflowSettingsSchema.safeParse({
        ...ok,
        delayReasons: ["Other", "other"],
      })
    ),
    "Delay reasons must be unique"
  )
  assert.equal(
    workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: 15 })
      .success,
    false
  )
  assert.equal(
    workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: 1.5 })
      .success,
    false
  )
  assert.equal(
    workflowSettingsSchema.safeParse({ ...ok, attentionWindowDays: Number.NaN })
      .success,
    false
  )
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
  assert.equal(
    firstError(providerSchema.safeParse({ ...ok, endpoint: "http://x.com" })),
    "The endpoint must use https://"
  )
  assert.equal(
    firstError(providerSchema.safeParse({ ...ok, models: [] })),
    "Add at least one model"
  )
  assert.equal(
    firstError(providerSchema.safeParse({ ...ok, defaultModel: "c" })),
    "Choose one of the selected models"
  )
  assert.equal(providerSchema.safeParse({ ...ok, apiKey: "" }).success, true)
  assert.equal(
    providerSchema.safeParse({ ...ok, apiKey: "12345678" }).success,
    true
  )
  assert.equal(
    firstError(providerSchema.safeParse({ ...ok, apiKey: "short" })),
    "API key must be at least 8 characters"
  )
})

test("fetch models rejects a short key", () => {
  const ok = {
    endpoint: "https://api.groq.com/openai/v1",
    apiKey: "",
  }
  assert.equal(fetchModelsSchema.safeParse(ok).success, true)
  assert.equal(
    firstError(fetchModelsSchema.safeParse({ ...ok, apiKey: "short" })),
    "API key must be at least 8 characters"
  )
})
