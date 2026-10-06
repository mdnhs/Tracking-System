import assert from "node:assert/strict"
import { test } from "node:test"

import { AI_FIELDS } from "@/lib/ai/fields"
import { buildPrompt } from "@/lib/ai/prompts"

test("buildPrompt includes the field instruction and context facts", () => {
  const { system, prompt } = buildPrompt("task-description", {
    title: "Client Website Homepage",
    project: "Apex Corp Website",
    department: "Design",
  })
  assert.match(system, /text only/i)
  assert.match(prompt, /Task: Client Website Homepage/)
  assert.match(prompt, /Project\/client: Apex Corp Website/)
  assert.match(prompt, /Department: Design/)
  assert.match(prompt, /description of the work/i)
})

test("buildPrompt ignores missing context and caps long values", () => {
  const { prompt } = buildPrompt("delay-explanation", {
    title: "x".repeat(500),
    reason: "Waiting for client information",
  })
  assert.equal(prompt.includes("Project/client:"), false)
  assert.equal(prompt.includes("Department:"), false)
  assert.equal(prompt.includes("x".repeat(201)), false)
  assert.match(prompt, /Recorded delay reason: Waiting for client information/)
  assert.match(prompt, /explanation of why this task is delayed/i)
})

test("buildPrompt has an instruction for every field", () => {
  for (const field of AI_FIELDS) {
    const { prompt } = buildPrompt(field)
    assert.ok(prompt.trim().length > 0, field)
  }
})
