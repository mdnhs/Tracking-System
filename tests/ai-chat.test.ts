import assert from "node:assert/strict"
import { test } from "node:test"

import { buildChatSystemPrompt, buildDataSnapshot } from "@/lib/ai/chat"

const data = {
  meta: {
    system: "TrackSys",
    preparedBy: "MD",
    date: "2026-10-06",
    illustrative: false,
  },
  hierarchy: [{ role: "MD", level: 1, responsibility: "Oversight" }],
  employees: [
    { id: "E1", name: "Asha", role: "Employee", department: "Design" },
  ],
  taskStatuses: [
    { key: "pending", label: "Pending", description: "Not started" },
  ],
  settings: {
    general: { companyName: "Acme", tagline: "Build things" },
    workflow: { delayReasons: ["Client"], attentionWindowDays: 2 },
    ai: {
      defaultProviderId: "p1",
      providers: [{ apiKeyEncrypted: "SECRET" }],
    },
  },
  tasks: [
    {
      id: "T1",
      title: "Homepage",
      description: "Build the homepage",
      assignedTo: "E1",
      assignedBy: "MD",
      department: "Design",
      priority: "high",
      startDate: "2026-10-01",
      deadline: "2026-10-05",
      project: "Website",
      attachments: [],
      status: "overdue",
      acceptedAt: null,
      completedAt: null,
      delayReason: "Client",
      delayExplanation: "Waiting on copy",
      holdReason: null,
      comments: 0,
    },
  ],
  dailyReports: [
    {
      date: "2026-10-06",
      employeeId: "E1",
      morning: {
        submitted: true,
        priorities: ["Homepage"],
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
    },
  ],
  visibilityQuestions: [{ key: "q", question: "Who is doing what?" }],
  benefits: [{ key: "b", title: "Clarity", description: "See the work" }],
  futureScalability: ["Add more"],
}

test("snapshot includes the tracking data and not provider secrets", () => {
  const snapshot = buildDataSnapshot(data, "2026-10-06")
  assert.match(snapshot, /Today: 2026-10-06/)
  assert.match(snapshot, /name: Acme/)
  assert.match(snapshot, /E1 \| Asha \| Employee \| Design/)
  assert.match(snapshot, /T1 \| Homepage/)
  assert.match(snapshot, /Homepage/)
  assert.match(snapshot, /Who is doing what\?/)
  assert.match(snapshot, /Clarity: See the work/)
  assert.equal(snapshot.includes("SECRET"), false)
  assert.equal(snapshot.includes("apiKeyEncrypted"), false)
})

test("snapshot marks unsubmitted reports and caps long text", () => {
  const long = {
    ...data,
    tasks: [{ ...data.tasks[0], description: "x".repeat(1000) }],
  }
  const snapshot = buildDataSnapshot(long, "2026-10-06")
  assert.match(snapshot, /Evening \(not submitted\)/)
  assert.equal(snapshot.includes("x".repeat(501)), false)
  assert.match(snapshot, /…/)
})

test("system prompt states the role, rules and today's date", () => {
  const prompt = buildChatSystemPrompt(data, "2026-10-06")
  assert.match(
    prompt,
    /AI assistant built into the Work Assignment Tracking System/
  )
  assert.match(prompt, /read-only assistant/)
  assert.match(prompt, /Today's date is 2026-10-06/)
  assert.match(prompt, /Answer only from the DATA section/)
  assert.match(prompt, /DATA\nToday: 2026-10-06/)
})
