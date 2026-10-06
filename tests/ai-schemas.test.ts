import assert from "node:assert/strict"
import { test } from "node:test"

import { aiFieldSchema, chatRequestSchema } from "@/lib/schemas"

test("aiFieldSchema accepts a known field and context", () => {
  const result = aiFieldSchema.safeParse({
    field: "task-description",
    context: { title: "Homepage" },
  })
  assert.equal(result.success, true)
})

test("aiFieldSchema rejects an unknown field", () => {
  assert.equal(aiFieldSchema.safeParse({ field: "nope" }).success, false)
})

test("aiFieldSchema truncates long context instead of failing", () => {
  const result = aiFieldSchema.safeParse({
    field: "task-description",
    context: { title: "x".repeat(500) },
  })
  assert.equal(result.success, true)
  assert.equal(result.success && result.data.context?.title.length, 200)
})

test("chatRequestSchema accepts a user-led conversation", () => {
  const result = chatRequestSchema.safeParse({
    messages: [
      { role: "user", content: "How many tasks are overdue?" },
      { role: "assistant", content: "Two." },
      { role: "user", content: "Which ones?" },
    ],
  })
  assert.equal(result.success, true)
})

test("chatRequestSchema rejects empty, assistant-led or oversized history", () => {
  assert.equal(chatRequestSchema.safeParse({ messages: [] }).success, false)
  assert.equal(
    chatRequestSchema.safeParse({
      messages: [{ role: "assistant", content: "Hi" }],
    }).success,
    false
  )
  assert.equal(
    chatRequestSchema.safeParse({
      messages: Array.from({ length: 25 }, () => ({
        role: "user",
        content: "hi",
      })),
    }).success,
    false
  )
})
