import { addDays } from "@/lib/analytics"
import type { Task, TaskStatusKey } from "@/lib/types"

const OPEN_STATUSES: TaskStatusKey[] = ["pending", "in-progress", "overdue"]

export function isPastDeadline(task: Task, today: string): boolean {
  return task.deadline < today
}

export function syncOverdue(tasks: Task[], today: string): void {
  for (const task of tasks) {
    if (
      (task.status === "pending" || task.status === "in-progress") &&
      isPastDeadline(task, today)
    ) {
      task.status = "overdue"
    }
  }
}

export function needsDelayReason(task: Task, today: string): boolean {
  return (
    OPEN_STATUSES.includes(task.status) &&
    isPastDeadline(task, today) &&
    !task.delayReason
  )
}

export type CompletionTiming = "on-time" | "late"

export function completionTiming(task: Task): CompletionTiming | null {
  if (task.status !== "completed" || !task.completedAt) return null
  return task.completedAt > task.deadline ? "late" : "on-time"
}

export function isActive(task: Task): boolean {
  return task.status !== "cancelled"
}

export function canAccept(task: Task): boolean {
  return (
    !task.acceptedAt && (task.status === "pending" || task.status === "overdue")
  )
}

export function acceptTask(task: Task, today: string): boolean {
  if (!canAccept(task)) return false
  task.acceptedAt = today
  return true
}

export function canTransition(
  task: Task,
  to: TaskStatusKey,
  today: string
): boolean {
  switch (to) {
    case "in-progress":
      return (
        (task.status === "pending" && Boolean(task.acceptedAt)) ||
        task.status === "on-hold"
      )
    case "completed":
      return (
        (task.status === "in-progress" ||
          (task.status === "overdue" && Boolean(task.acceptedAt))) &&
        !needsDelayReason(task, today)
      )
    case "on-hold":
      return (
        task.status === "in-progress" ||
        (task.status === "overdue" && Boolean(task.acceptedAt))
      )
    case "cancelled":
      return task.status !== "completed" && task.status !== "cancelled"
    default:
      return false
  }
}

export function applyTransition(
  task: Task,
  to: TaskStatusKey,
  today: string
): boolean {
  if (!canTransition(task, to, today)) return false
  task.status = to
  task.completedAt = to === "completed" ? today : null
  if (to !== "on-hold") task.holdReason = null
  if (to === "in-progress") syncOverdue([task], today)
  return true
}

export function needsAttention(
  tasks: Task[],
  today: string,
  limit = 6
): Task[] {
  const soon = addDays(today, 2)
  return tasks
    .filter(
      (t) =>
        t.status === "overdue" ||
        ((t.status === "pending" || t.status === "in-progress") &&
          t.deadline <= soon)
    )
    .sort(
      (a, b) =>
        Number(b.status === "overdue") - Number(a.status === "overdue") ||
        a.deadline.localeCompare(b.deadline)
    )
    .slice(0, limit)
}
