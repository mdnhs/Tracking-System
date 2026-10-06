import type { AppSettings } from "@/lib/settings-model"
import type { DailyReport, Task, TrackingData } from "@/lib/types"

// Both the stored settings and the public settings satisfy this; only these two groups are read.
export type ChatData = Omit<TrackingData, "settings"> & {
  settings: Pick<AppSettings, "general" | "workflow">
}

export const CHAT_TIMEOUT_MS = 30_000
const MAX_FIELD = 500
const MAX_SNAPSHOT = 100_000

function clean(value: string | null | undefined, max = MAX_FIELD): string {
  if (!value) return ""
  const collapsed = value.replace(/\s+/g, " ").trim()
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed
}

function row(parts: (string | number | null | undefined)[]): string {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : clean(part)))
    .filter(Boolean)
    .join(" | ")
}

function reportSection(report: DailyReport): string {
  const { morning, evening } = report
  return [
    `${report.date} | ${report.employeeId}`,
    `  Morning${morning.submitted ? "" : " (not submitted)"}: priorities=${clean(morning.priorities.join("; "))}; planned=${clean(morning.plannedWork.join("; "))}; important=${clean(morning.importantTasks.join("; "))}; blockers=${clean(morning.blockers.join("; "))}`,
    `  Evening${evening.submitted ? "" : " (not submitted)"}: completed=${clean(evening.completed.join("; "))}; ongoing=${clean(evening.ongoing.join("; "))}; pending=${clean(evening.pending.join("; "))}; problems=${clean(evening.problems)}; incomplete reason=${clean(evening.incompleteReason)}`,
  ].join("\n")
}

function taskSection(task: Task): string {
  const description = clean(task.description)
  const explanation = clean(task.delayExplanation)
  const updates = (task.updates ?? []).map(
    (u) => `    - ${clean(u.author, 80)} (${u.at}): ${clean(u.text)}`
  )
  return [
    row([
      task.id,
      task.title,
      task.assignedTo,
      task.department,
      task.priority,
      task.status,
      `${task.startDate}→${task.deadline}`,
      task.project,
      task.completedAt ? `completed ${task.completedAt}` : null,
      task.delayReason ? `delay: ${task.delayReason}` : null,
      task.holdReason ? `on hold: ${task.holdReason}` : null,
    ]),
    description ? `    description: ${description}` : "",
    explanation ? `    delay explanation: ${explanation}` : "",
    updates.length > 0 ? `    updates:\n${updates.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildDataSnapshot(data: ChatData, today: string): string {
  const { general, workflow } = data.settings
  const sections = [
    `Today: ${today}`,
    "",
    "# Company",
    `name: ${clean(general.companyName, 120)}`,
    general.tagline ? `tagline: ${clean(general.tagline, 160)}` : null,
    `system: ${clean(data.meta.system, 160)}`,
    `prepared by: ${clean(data.meta.preparedBy, 120)}`,
    "",
    "# Organization hierarchy",
    ...data.hierarchy.map((h) =>
      row([h.role, `level ${h.level}`, h.responsibility])
    ),
    "",
    "# Employees",
    ...data.employees.map((e) => row([e.id, e.name, e.role, e.department])),
    "",
    "# Task statuses",
    ...data.taskStatuses.map((s) => row([s.key, s.label, s.description])),
    "",
    "# Workflow settings",
    `attention window: ${workflow.attentionWindowDays} days`,
    `delay reasons: ${workflow.delayReasons.join(", ")}`,
    "",
    "# Tasks",
    ...data.tasks.map(taskSection),
    "",
    "# Daily reports",
    ...data.dailyReports.map(reportSection),
    "",
    "# Visibility questions",
    ...data.visibilityQuestions.map((q) => `- ${clean(q.question)}`),
    "",
    "# Benefits",
    ...data.benefits.map(
      (b) => `- ${clean(b.title, 120)}: ${clean(b.description)}`
    ),
    "",
    "# Future scalability",
    ...data.futureScalability.map((f) => `- ${clean(f, 200)}`),
  ].filter((line): line is string => line !== null)

  const snapshot = sections.join("\n")
  return snapshot.length > MAX_SNAPSHOT
    ? `${snapshot.slice(0, MAX_SNAPSHOT)}\n[snapshot truncated]`
    : snapshot
}

export function buildChatSystemPrompt(data: ChatData, today: string): string {
  return [
    "You are the AI assistant built into the Work Assignment Tracking System.",
    "You help the Managing Director (MD) understand, search and analyse the system's data through conversation.",
    "You are a read-only assistant: you can only read the data below. You cannot create, edit, delete, assign or complete anything.",
    "",
    "Rules:",
    "- Answer only from the DATA section below. If the data does not contain the answer, say so plainly instead of guessing.",
    "- Be concise, specific and factual. Use the real names, dates, statuses and numbers from the data.",
    "- You may summarise, compare, rank, count and compute simple statistics (for example overdue tasks per employee, completion rates, delay reasons, report submissions).",
    "- Format answers with short paragraphs or simple markdown lists. Keep tables narrow enough for a chat panel.",
    "- Never invent records or numbers, and never claim an action was performed.",
    "- You are an AI, not a human. If asked, say so.",
    `- Today's date is ${today}. Treat it as "now" for questions about overdue or due-soon work.`,
    "",
    "DATA",
    buildDataSnapshot(data, today),
  ].join("\n")
}
