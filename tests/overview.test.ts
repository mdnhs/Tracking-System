import assert from "node:assert/strict"
import { test } from "node:test"

import { buildOverview, overviewCsv, periodRange } from "@/lib/overview"

const mk = (o = {}) => ({
  id: "T",
  title: "Task",
  description: "",
  assignedTo: "E1",
  assignedBy: "MD",
  department: "Ops",
  priority: "high",
  startDate: "2026-10-06",
  deadline: "2026-10-10",
  project: "",
  attachments: 0,
  status: "pending",
  completedAt: null,
  delayReason: null,
  delayExplanation: null,
  comments: 0,
  ...o,
})
const report = (o) => ({
  date: "2026-10-06",
  employeeId: "E1",
  morning: {
    submitted: true,
    priorities: [],
    plannedWork: [],
    importantTasks: [],
    blockers: [],
  },
  evening: {
    submitted: false,
    completed: [],
    ongoing: [],
    pending: [],
    problems: "",
    incompleteReason: "",
  },
  ...o,
})

test("periodRange", () => {
  assert.deepEqual(periodRange("daily", "2026-10-06"), {
    from: "2026-10-06",
    to: "2026-10-06",
  })
  assert.deepEqual(periodRange("weekly", "2026-10-06"), {
    from: "2026-10-05",
    to: "2026-10-06",
  })
  assert.deepEqual(periodRange("monthly", "2026-10-06"), {
    from: "2026-10-01",
    to: "2026-10-06",
  })
})

test("weekly overview counts only in-range activity", () => {
  const data = {
    employees: [
      { id: "E1", name: "A", department: "Ops" },
      { id: "E2", name: "B", department: "HR" },
    ],
    tasks: [
      mk({ id: "T1" }),
      mk({
        id: "T2",
        startDate: "2026-09-01",
        status: "completed",
        completedAt: "2026-10-05",
        deadline: "2026-10-05",
      }),
      mk({
        id: "T3",
        startDate: "2026-09-01",
        status: "completed",
        completedAt: "2026-10-06",
        deadline: "2026-10-04",
        delayReason: "Technical issue",
      }),
      mk({
        id: "T4",
        startDate: "2026-09-01",
        status: "completed",
        completedAt: "2026-09-20",
        deadline: "2026-09-10",
      }),
      mk({
        id: "T5",
        assignedTo: "E2",
        department: "HR",
        status: "overdue",
        deadline: "2026-10-01",
        startDate: "2026-09-25",
      }),
      mk({ id: "T6", status: "cancelled" }),
    ],
    dailyReports: [report({}), report({ date: "2026-09-30" })],
  }
  const o = buildOverview(data, "weekly", "2026-10-06")
  assert.deepEqual(o.summary, {
    assigned: 1,
    completed: 2,
    completedOnTime: 1,
    completedLate: 1,
    pendingNow: 1,
    inProgressNow: 0,
    overdueNow: 1,
    morningReports: 1,
    eveningReports: 0,
  })
  assert.deepEqual(
    o.delayed.map((t) => t.id),
    ["T3", "T5"]
  )
  assert.deepEqual(o.delayReasons, [
    { reason: "Technical issue", count: 1, percent: 100 },
  ])
  assert.equal(o.employees[0].morningReports, 1)
  assert.equal(o.employees[0].eveningReports, 0)
  assert.deepEqual(
    o.departments.map((d) => d.department),
    ["HR", "Ops"]
  )
  assert.equal(o.trend.length, 1)
  assert.equal(buildOverview(data, "monthly", "2026-10-06").trend.length, 2)
})

test("csv escapes quotes, commas and formula prefixes", () => {
  const data = {
    employees: [{ id: "E1", name: 'Cian "C", O', department: "Ops" }],
    tasks: [
      mk({ title: "=HYPERLINK(1)", status: "overdue", deadline: "2026-10-01" }),
    ],
    dailyReports: [],
  }
  const csv = overviewCsv(buildOverview(data, "daily", "2026-10-06"))
  assert.match(csv, /"Cian ""C"", O"/)
  assert.match(csv, /'=HYPERLINK\(1\)/)
})
