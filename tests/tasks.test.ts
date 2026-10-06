import assert from "node:assert/strict"
import { test } from "node:test"

import {
  acceptTask,
  applyTransition,
  canTransition,
  completionTiming,
  needsDelayReason,
  syncOverdue,
} from "@/lib/tasks"

const base = {
  id: "T-1",
  title: "",
  description: "",
  assignedTo: "E1",
  assignedBy: "MD",
  department: "",
  priority: "high",
  startDate: "2026-10-01",
  deadline: "2026-10-05",
  project: "",
  attachments: 0,
  status: "in-progress",
  acceptedAt: "2026-10-01",
  completedAt: null,
  delayReason: null,
  delayExplanation: null,
  comments: 0,
}
const mk = (o = {}) => ({ ...base, ...o })

test("syncOverdue flags open tasks past deadline only", () => {
  const tasks = [
    mk({ status: "pending" }),
    mk({ status: "in-progress" }),
    mk({ status: "on-hold" }),
    mk({ status: "completed" }),
    mk({ status: "in-progress", deadline: "2026-10-06" }),
  ]
  syncOverdue(tasks, "2026-10-06")
  assert.deepEqual(
    tasks.map((t) => t.status),
    ["overdue", "overdue", "on-hold", "completed", "in-progress"]
  )
})

test("deadline day itself is not overdue", () => {
  const t = mk()
  syncOverdue([t], "2026-10-05")
  assert.equal(t.status, "in-progress")
})

test("overdue task cannot complete without a delay reason", () => {
  const t = mk({ status: "overdue" })
  assert.equal(needsDelayReason(t, "2026-10-06"), true)
  assert.equal(applyTransition(t, "completed", "2026-10-06"), false)
  assert.equal(t.status, "overdue")
  t.delayReason = "Technical issue"
  assert.equal(applyTransition(t, "completed", "2026-10-06"), true)
  assert.equal(t.completedAt, "2026-10-06")
  assert.equal(completionTiming(t), "late")
})

test("on-time completion is recorded", () => {
  const t = mk()
  assert.equal(applyTransition(t, "completed", "2026-10-04"), true)
  assert.equal(completionTiming(t), "on-time")
})

test("resuming an on-hold task past deadline lands in overdue", () => {
  const t = mk({ status: "on-hold" })
  assert.equal(applyTransition(t, "in-progress", "2026-10-06"), true)
  assert.equal(t.status, "overdue")
})

test("closed tasks have no transitions", () => {
  for (const status of ["completed", "cancelled"]) {
    const t = mk({ status })
    for (const to of ["in-progress", "completed", "on-hold", "cancelled"]) {
      assert.equal(canTransition(t, to, "2026-10-01"), false)
    }
  }
})

test("pending work must be accepted before it can start or complete", () => {
  const t = mk({ status: "pending", acceptedAt: null })
  assert.equal(canTransition(t, "in-progress", "2026-10-02"), false)
  assert.equal(acceptTask(t, "2026-10-02"), true)
  assert.equal(t.acceptedAt, "2026-10-02")
  assert.equal(acceptTask(t, "2026-10-03"), false)
  assert.equal(applyTransition(t, "in-progress", "2026-10-02"), true)
})

test("unaccepted overdue task cannot complete even with a reason", () => {
  const t = mk({ status: "overdue", acceptedAt: null, delayReason: "Other" })
  assert.equal(canTransition(t, "completed", "2026-10-06"), false)
  acceptTask(t, "2026-10-06")
  assert.equal(canTransition(t, "completed", "2026-10-06"), true)
})

test("resuming clears the hold reason", () => {
  const t = mk({
    status: "on-hold",
    holdReason: "Waiting on vendor",
    deadline: "2026-10-30",
  })
  assert.equal(applyTransition(t, "in-progress", "2026-10-06"), true)
  assert.equal(t.holdReason, null)
})
