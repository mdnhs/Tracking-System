export const AI_FIELDS = [
  "task-description",
  "task-update",
  "delay-explanation",
  "morning-priorities",
  "morning-planned-work",
  "morning-important-tasks",
  "morning-blockers",
  "evening-completed",
  "evening-ongoing",
  "evening-pending",
  "evening-problems",
  "evening-incomplete-reason",
] as const

export type AiField = (typeof AI_FIELDS)[number]

export interface AiFieldContext {
  title?: string
  project?: string
  department?: string
  reason?: string
  employee?: string
}
