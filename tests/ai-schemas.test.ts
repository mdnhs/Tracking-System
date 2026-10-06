import assert from "node:assert/strict"
import { test } from "node:test"

import { aiFieldSchema } from "@/lib/schemas"

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
