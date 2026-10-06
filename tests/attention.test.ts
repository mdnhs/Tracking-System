import assert from "node:assert/strict"
import { test } from "node:test"

import { needsAttention } from "@/lib/tasks"

const mk = (id, status, deadline) => ({ id, status, deadline })

test("overdue first, then open tasks due within two days by deadline", () => {
  const tasks = [
    mk("far", "pending", "2026-10-20"),
    mk("soon2", "in-progress", "2026-10-08"),
    mk("soon1", "pending", "2026-10-06"),
    mk("late", "overdue", "2026-10-03"),
    mk("done", "completed", "2026-10-06"),
    mk("held", "on-hold", "2026-10-06"),
  ]
  assert.deepEqual(
    needsAttention(tasks, "2026-10-06").map((t) => t.id),
    ["late", "soon1", "soon2"]
  )
  assert.equal(needsAttention(tasks, "2026-10-06", 2, 1).length, 1)
})

test("window length is configurable", () => {
  const tasks = [
    mk("d3", "pending", "2026-10-09"),
    mk("d5", "pending", "2026-10-11"),
  ]
  assert.deepEqual(
    needsAttention(tasks, "2026-10-06", 3).map((t) => t.id),
    ["d3"]
  )
  assert.deepEqual(
    needsAttention(tasks, "2026-10-06", 5).map((t) => t.id),
    ["d3", "d5"]
  )
})
