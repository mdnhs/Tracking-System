import assert from "node:assert/strict"
import { test } from "node:test"

import { AiError } from "@/lib/ai/client"
import {
  generationErrorMessage,
  NOT_CONFIGURED,
} from "@/lib/ai/generation-error"

test("configuration errors map to the setup message", () => {
  for (const message of [
    "No default AI provider is configured",
    "The default AI provider has no default model",
    "The default AI provider has no API key",
    "Stored API key cannot be read — enter it again",
    "SETTINGS_SECRET is not set. Add it to .env.local (at least 16 characters) and restart the server.",
  ]) {
    assert.equal(
      generationErrorMessage(new AiError(message)),
      NOT_CONFIGURED,
      message
    )
  }
})

test("other AiErrors pass through and unknown errors are generic", () => {
  assert.equal(
    generationErrorMessage(new AiError("Could not reach the endpoint")),
    "Could not reach the endpoint"
  )
  assert.equal(
    generationErrorMessage(new Error("boom")),
    "AI generation failed. Try again."
  )
})
