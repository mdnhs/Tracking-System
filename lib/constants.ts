import type { TaskStatusKey } from "@/lib/types"

export const STATUS_COLORS: Record<TaskStatusKey, string> = {
  pending: "#f59e0b",
  "in-progress": "#3b82f6",
  completed: "#10b981",
  overdue: "#ef4444",
  "on-hold": "#8b5cf6",
  cancelled: "#9ca3af",
}
