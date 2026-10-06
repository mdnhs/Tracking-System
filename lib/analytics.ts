import type {
  DelayEntry,
  Employee,
  Task,
  TrendEntry,
  WorkloadEntry,
} from "@/lib/types"

function toDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z")
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const date = toDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toISO(date)
}

export function weekStart(iso: string): string {
  const offset = (toDate(iso).getUTCDay() + 6) % 7
  return addDays(iso, -offset)
}

export function inRange(iso: string | null, from: string, to: string): boolean {
  return iso !== null && iso >= from && iso <= to
}

export function completionTrend(
  tasks: Task[],
  today: string,
  weeks = 8
): TrendEntry[] {
  const lastWeek = weekStart(today)
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(lastWeek, (i - weeks + 1) * 7)
    const to = addDays(from, 6)
    return {
      week: from,
      completed: tasks.filter(
        (t) => t.status === "completed" && inRange(t.completedAt, from, to)
      ).length,
    }
  })
}

export function workload(
  tasks: Task[],
  employees: Employee[]
): WorkloadEntry[] {
  return employees.map((employee) => {
    const mine = tasks.filter(
      (t) => t.assignedTo === employee.id && t.status !== "cancelled"
    )
    return {
      employee: employee.id,
      assigned: mine.length,
      completed: mine.filter((t) => t.status === "completed").length,
    }
  })
}

export function delayAnalysis(tasks: Task[]): DelayEntry[] {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (task.delayReason) {
      counts.set(task.delayReason, (counts.get(task.delayReason) ?? 0) + 1)
    }
  }
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  return [...counts]
    .map(([reason, count]) => ({
      reason,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}
