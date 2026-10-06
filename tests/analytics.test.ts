import assert from "node:assert/strict"
import { test } from "node:test"

import {
  addDays,
  completionTrend,
  delayAnalysis,
  weekStart,
  workload,
} from "@/lib/analytics"

const mk = (o = {}) => ({
  id: "T",
  title: "",
  description: "",
  assignedTo: "E1",
  assignedBy: "MD",
  department: "",
  priority: "high",
  startDate: "2026-09-01",
  deadline: "2026-10-05",
  project: "",
  attachments: 0,
  status: "pending",
  completedAt: null,
  delayReason: null,
  delayExplanation: null,
  comments: 0,
  ...o,
})

test("weekStart is Monday", () => {
  assert.equal(weekStart("2026-10-06"), "2026-10-05") // Tuesday
  assert.equal(weekStart("2026-10-05"), "2026-10-05") // Monday
  assert.equal(weekStart("2026-10-11"), "2026-10-05") // Sunday
  assert.equal(addDays("2026-09-30", 2), "2026-10-02")
})

test("completionTrend buckets completions into weeks ending this week", () => {
  const tasks = [
    mk({ status: "completed", completedAt: "2026-10-05" }),
    mk({ status: "completed", completedAt: "2026-10-04" }),
    mk({ status: "completed", completedAt: "2026-09-28" }),
    mk({ status: "in-progress" }),
  ]
  const trend = completionTrend(tasks, "2026-10-06", 3)
  assert.deepEqual(trend, [
    { week: "2026-09-21", completed: 0 },
    { week: "2026-09-28", completed: 2 },
    { week: "2026-10-05", completed: 1 },
  ])
})

test("workload ignores cancelled tasks", () => {
  const tasks = [
    mk({ status: "completed", completedAt: "2026-10-01" }),
    mk({ status: "pending" }),
    mk({ status: "cancelled" }),
    mk({ assignedTo: "E2" }),
  ]
  assert.deepEqual(workload(tasks, [{ id: "E1" }, { id: "E3" }]), [
    { employee: "E1", assigned: 2, completed: 1 },
    { employee: "E3", assigned: 0, completed: 0 },
  ])
})

test("delayAnalysis shares sorted by count", () => {
  const tasks = [
    mk({ delayReason: "A" }),
    mk({ delayReason: "B" }),
    mk({ delayReason: "B" }),
    mk({ delayReason: "B" }),
    mk(),
  ]
  assert.deepEqual(delayAnalysis(tasks), [
    { reason: "B", count: 3, percent: 75 },
    { reason: "A", count: 1, percent: 25 },
  ])
  assert.deepEqual(delayAnalysis([]), [])
})
