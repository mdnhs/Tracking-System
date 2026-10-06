import { isActive } from "@/lib/tasks"
import type { Task } from "@/lib/types"

export { getData } from "@/lib/store"
export { formatDate } from "@/lib/format"

export interface TaskCounts {
  total: number
  active: number
  completed: number
  completedToday: number
  inProgress: number
  pending: number
  overdue: number
}

export function countTasks(tasks: Task[], today: string): TaskCounts {
  return {
    total: tasks.length,
    active: tasks.filter(isActive).length,
    completed: tasks.filter((t) => t.status === "completed").length,
    completedToday: tasks.filter(
      (t) => t.status === "completed" && t.completedAt === today
    ).length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
  }
}
