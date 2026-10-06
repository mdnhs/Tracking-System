import { z } from "zod"

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
const optionalText = (max: number) => z.string().trim().max(max)

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Task title is required").max(120),
    description: optionalText(2000),
    assignedTo: z.string().min(1, "Choose who is responsible"),
    priority: z.enum(["high", "medium", "low"]),
    department: z.string(),
    project: optionalText(120),
    startDate: isoDate,
    deadline: isoDate,
  })
  .refine((v) => v.deadline >= v.startDate, {
    path: ["deadline"],
    message: "Deadline cannot be before the start date",
  })
export type CreateTaskValues = z.infer<typeof createTaskSchema>

export const delayReasonSchema = z.object({
  reason: z.string().min(1, "Choose a delay reason"),
  explanation: optionalText(500),
})
export type DelayReasonValues = z.infer<typeof delayReasonSchema>

export const holdSchema = z.object({
  reason: z.string().trim().min(1, "Say why the work is paused").max(200),
})
export type HoldValues = z.infer<typeof holdSchema>

export const reassignSchema = z.object({
  assignedTo: z.string().min(1, "Choose a person"),
})
export type ReassignValues = z.infer<typeof reassignSchema>

export const taskUpdateSchema = z.object({
  text: z.string().trim().min(1, "Write an update first").max(1000),
})
export type TaskUpdateValues = z.infer<typeof taskUpdateSchema>

const reportLines = optionalText(2000)

export const morningReportSchema = z
  .object({
    priorities: reportLines,
    plannedWork: reportLines,
    importantTasks: reportLines,
    blockers: reportLines,
  })
  .refine((v) => v.priorities || v.plannedWork || v.importantTasks, {
    path: ["priorities"],
    message: "Add at least one priority, planned item or important task",
  })
export type MorningReportValues = z.infer<typeof morningReportSchema>

export const eveningReportSchema = z
  .object({
    completed: reportLines,
    ongoing: reportLines,
    pending: reportLines,
    problems: optionalText(500),
    incompleteReason: optionalText(500),
  })
  .refine((v) => v.completed || v.ongoing || v.pending, {
    path: ["completed"],
    message: "Add at least one completed, ongoing or pending item",
  })
export type EveningReportValues = z.infer<typeof eveningReportSchema>

export const uploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, "Choose at least one file")
    .refine((files) => files.every((f) => f.size <= MAX_ATTACHMENT_BYTES), {
      message: "Each file must be 10 MB or smaller",
    }),
})
export type UploadValues = z.infer<typeof uploadSchema>

export const reportDateSchema = z.object({ date: isoDate })
export type ReportDateValues = z.infer<typeof reportDateSchema>

export function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
