import { z } from "zod"

import { AI_FIELDS } from "@/lib/ai/fields"

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

const httpsUrl = z
  .string()
  .trim()
  .min(1, "Enter the API endpoint")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:"
    } catch {
      return false
    }
  }, "The endpoint must use https://")

export const generalSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(80),
  tagline: optionalText(160),
})
export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>

export const workflowSettingsSchema = z.object({
  delayReasons: z
    .array(z.string().trim().min(1, "Reason cannot be empty").max(80))
    .min(1, "Keep at least one delay reason")
    .refine(
      (list) => new Set(list.map((r) => r.toLowerCase())).size === list.length,
      "Delay reasons must be unique"
    ),
  attentionWindowDays: z
    .number({ error: "Enter a whole number of days" })
    .int("Enter a whole number of days")
    .min(1, "At least 1 day")
    .max(14, "At most 14 days"),
})
export type WorkflowSettingsValues = z.infer<typeof workflowSettingsSchema>

// A short key would be shown in full by the masked hint, so blank or 8+ only.
const apiKeyField = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || value.length >= 8,
    "API key must be at least 8 characters"
  )

export const providerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Name is required").max(40),
    endpoint: httpsUrl,
    apiKey: apiKeyField,
    models: z.array(z.string().trim().min(1)).min(1, "Add at least one model"),
    defaultModel: z.string().min(1, "Choose a default model"),
  })
  .refine((v) => v.models.includes(v.defaultModel), {
    path: ["defaultModel"],
    message: "Choose one of the selected models",
  })
export type ProviderValues = z.infer<typeof providerSchema>

export const fetchModelsSchema = z.object({
  providerId: z.string().optional(),
  endpoint: httpsUrl,
  apiKey: apiKeyField,
})
export type FetchModelsValues = z.infer<typeof fetchModelsSchema>

export const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  role: z.string().min(1, "Choose a role"),
  department: z.string().trim().min(1, "Department is required").max(60),
})
export type EmployeeValues = z.infer<typeof employeeSchema>

// Context is a hint for the prompt; long values are capped rather than rejected.
const aiContextField = z.string().transform((value) => value.slice(0, 200))

export const aiFieldSchema = z.object({
  field: z.enum(AI_FIELDS),
  context: z
    .object({
      title: aiContextField.optional(),
      project: aiContextField.optional(),
      department: aiContextField.optional(),
      reason: aiContextField.optional(),
      employee: aiContextField.optional(),
    })
    .optional(),
})
export type AiFieldValues = z.infer<typeof aiFieldSchema>

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(6000),
})

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(24),
  })
  .refine((v) => v.messages.at(-1)?.role === "user", {
    path: ["messages"],
    message: "The last message must be from the user",
  })
export type ChatRequestValues = z.infer<typeof chatRequestSchema>
