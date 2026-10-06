"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { z } from "zod"

import { removeAttachment, saveAttachment } from "@/lib/attachments"
import { todayISO } from "@/lib/format"
import {
  canAssignTo,
  canManageTask,
  canSetStatus,
  canWorkOnTask,
  isManagement,
} from "@/lib/permissions"
import { upsertReport } from "@/lib/reports"
import {
  createTaskSchema,
  delayReasonSchema,
  eveningReportSchema,
  holdSchema,
  MAX_ATTACHMENT_BYTES,
  morningReportSchema,
  reassignSchema,
  splitLines,
  taskUpdateSchema,
  type CreateTaskValues,
  type DelayReasonValues,
  type EveningReportValues,
  type HoldValues,
  type MorningReportValues,
  type ReassignValues,
  type TaskUpdateValues,
} from "@/lib/schemas"
import { getSession, USER_COOKIE } from "@/lib/session"
import { mutate } from "@/lib/store"
import { acceptTask, applyTransition } from "@/lib/tasks"
import type { Task, TaskStatusKey, TrackingData } from "@/lib/types"

export interface ActionResult {
  ok: boolean
  error?: string
  taskId?: string
}

const OK: ActionResult = { ok: true }

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

function refresh() {
  revalidatePath("/", "layout")
}

function findTask(data: TrackingData, id: string): Task | undefined {
  return data.tasks.find((item) => item.id === id)
}

function fail(error: string): ActionResult {
  return { ok: false, error }
}

// Server re-validates with the same schema the form used on the client.
function parse<T>(
  schema: z.ZodType<T>,
  values: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(values)
  return result.success
    ? { data: result.data }
    : { error: result.error.issues[0]?.message ?? "Invalid input" }
}

function logUpdate(task: Task, author: string, text: string) {
  task.comments += 1
  task.updates = [
    ...(task.updates ?? []),
    { author, text, at: new Date().toISOString() },
  ]
}

export async function switchUser(userId: string): Promise<void> {
  const { users } = await getSession()
  const user = users.find((u) => u.id === userId)
  if (!user) return

  ;(await cookies()).set(USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  })
  redirect(isManagement(user) ? "/dashboard" : "/employee")
}

export async function createTask(
  values: CreateTaskValues
): Promise<ActionResult> {
  const parsed = parse(createTaskSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const input = parsed.data
  const { user } = await getSession()

  const taskId = await mutate((data) => {
    const assignee = data.employees.find((e) => e.id === input.assignedTo)
    if (!assignee || !canAssignTo(user, assignee)) return null

    const highest = data.tasks.reduce((max, task) => {
      const value = Number.parseInt(task.id.replace(/\D/g, ""), 10)
      return Number.isFinite(value) ? Math.max(max, value) : max
    }, 100)
    const id = `T-${highest + 1}`

    data.tasks.unshift({
      id,
      title: input.title,
      description: input.description,
      assignedTo: assignee.id,
      assignedBy: user.role,
      department: input.department || assignee.department,
      priority: input.priority,
      startDate: input.startDate,
      deadline: input.deadline,
      project: input.project || "General",
      attachments: [],
      status: "pending",
      acceptedAt: null,
      completedAt: null,
      delayReason: null,
      delayExplanation: null,
      holdReason: null,
      comments: 0,
    })
    return id
  })

  if (!taskId) return fail("You cannot assign work to this person.")
  refresh()
  return { ok: true, taskId }
}

export async function acceptAssignedTask(formData: FormData): Promise<void> {
  const { user } = await getSession()
  const id = str(formData, "id")

  await mutate((data) => {
    const task = findTask(data, id)
    if (task && task.assignedTo === user.id) acceptTask(task, todayISO())
  })

  refresh()
}

export async function setTaskStatus(formData: FormData): Promise<void> {
  const { user } = await getSession()
  const id = str(formData, "id")
  const status = str(formData, "status") as TaskStatusKey
  // On hold needs a reason, so it only goes through holdTask.
  if (!id || !status || status === "on-hold") return

  await mutate((data) => {
    const task = findTask(data, id)
    if (task && canSetStatus(user, task, status, data.employees)) {
      applyTransition(task, status, todayISO())
    }
  })

  refresh()
}

export async function holdTask(
  taskId: string,
  values: HoldValues
): Promise<ActionResult> {
  const parsed = parse(holdSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const { reason } = parsed.data
  const { user } = await getSession()

  const ok = await mutate((data) => {
    const task = findTask(data, taskId)
    if (!task || !canSetStatus(user, task, "on-hold", data.employees)) {
      return false
    }
    if (!applyTransition(task, "on-hold", todayISO())) return false
    task.holdReason = reason
    logUpdate(task, user.name, `Put on hold: ${reason}`)
    return true
  })

  if (!ok) return fail("This task cannot be put on hold.")
  refresh()
  return OK
}

export async function reassignTask(
  taskId: string,
  values: ReassignValues
): Promise<ActionResult> {
  const parsed = parse(reassignSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const { assignedTo } = parsed.data
  const { user } = await getSession()

  const ok = await mutate((data) => {
    const task = findTask(data, taskId)
    const from = data.employees.find((e) => e.id === task?.assignedTo)
    const to = data.employees.find((e) => e.id === assignedTo)
    if (!task || !to || task.assignedTo === to.id) return false
    if (task.status === "completed" || task.status === "cancelled") return false
    if (!canManageTask(user, task, data.employees) || !canAssignTo(user, to)) {
      return false
    }
    task.assignedTo = to.id
    task.assignedBy = user.role
    // The new assignee has to accept the work themselves.
    task.acceptedAt = null
    if (task.status === "in-progress" || task.status === "on-hold") {
      task.status = "pending"
      task.holdReason = null
    }
    logUpdate(
      task,
      user.name,
      `Reassigned from ${from?.name ?? "unassigned"} to ${to.name}`
    )
    return true
  })

  if (!ok) return fail("You cannot reassign this task to that person.")
  refresh()
  return OK
}

export async function recordDelayReason(
  taskId: string,
  values: DelayReasonValues
): Promise<ActionResult> {
  const parsed = parse(delayReasonSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const { reason, explanation } = parsed.data
  const { user } = await getSession()

  const ok = await mutate((data) => {
    const task = findTask(data, taskId)
    if (!task || !canWorkOnTask(user, task, data.employees)) return false
    if (!data.delayReasons.includes(reason)) return false
    task.delayReason = reason
    task.delayExplanation = explanation || null
    return true
  })

  if (!ok) return fail("This delay reason could not be saved.")
  refresh()
  return OK
}

export async function addTaskUpdate(
  taskId: string,
  values: TaskUpdateValues
): Promise<ActionResult> {
  const parsed = parse(taskUpdateSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const { user } = await getSession()

  const ok = await mutate((data) => {
    const task = findTask(data, taskId)
    if (!task || !canWorkOnTask(user, task, data.employees)) return false
    logUpdate(task, user.name, parsed.data.text)
    return true
  })

  if (!ok) return fail("You cannot post updates on this task.")
  refresh()
  return OK
}

export async function submitMorningReport(
  values: MorningReportValues
): Promise<ActionResult> {
  const parsed = parse(morningReportSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const input = parsed.data
  const { user } = await getSession()

  const ok = await mutate((data) => {
    if (!data.employees.some((e) => e.id === user.id)) return false
    const report = upsertReport(data.dailyReports, user.id, todayISO())
    report.morning = {
      submitted: true,
      priorities: splitLines(input.priorities),
      plannedWork: splitLines(input.plannedWork),
      importantTasks: splitLines(input.importantTasks),
      blockers: splitLines(input.blockers),
    }
    return true
  })

  if (!ok) return fail("Only employees submit daily reports.")
  refresh()
  return OK
}

export async function submitEveningReport(
  values: EveningReportValues
): Promise<ActionResult> {
  const parsed = parse(eveningReportSchema, values)
  if ("error" in parsed) return fail(parsed.error)
  const input = parsed.data
  const { user } = await getSession()

  const ok = await mutate((data) => {
    if (!data.employees.some((e) => e.id === user.id)) return false
    const report = upsertReport(data.dailyReports, user.id, todayISO())
    report.evening = {
      submitted: true,
      completed: splitLines(input.completed),
      ongoing: splitLines(input.ongoing),
      pending: splitLines(input.pending),
      problems: input.problems,
      incompleteReason: input.incompleteReason,
    }
    return true
  })

  if (!ok) return fail("Only employees submit daily reports.")
  refresh()
  return OK
}

export async function uploadAttachments(
  formData: FormData
): Promise<ActionResult> {
  const { user, all } = await getSession()
  const id = str(formData, "id")
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (files.length === 0) return fail("Choose at least one file")
  if (files.some((f) => f.size > MAX_ATTACHMENT_BYTES)) {
    return fail("Each file must be 10 MB or smaller")
  }
  const task = findTask(all, id)
  if (!task || !canWorkOnTask(user, task, all.employees)) {
    return fail("You cannot attach files to this task.")
  }

  const saved = await Promise.all(
    files.map((file) => saveAttachment(id, file, user.name))
  )
  await mutate((data) => {
    findTask(data, id)?.attachments.push(...saved)
  })

  refresh()
  return OK
}

export async function deleteAttachment(formData: FormData): Promise<void> {
  const { user } = await getSession()
  const id = str(formData, "id")
  const fileId = str(formData, "fileId")

  const removed = await mutate((data) => {
    const task = findTask(data, id)
    const file = task?.attachments.find((a) => a.id === fileId)
    if (!task || !file) return false
    const allowed =
      canManageTask(user, task, data.employees) ||
      (canWorkOnTask(user, task, data.employees) &&
        file.uploadedBy === user.name)
    if (!allowed) return false
    task.attachments = task.attachments.filter((a) => a.id !== fileId)
    return true
  })
  if (removed) await removeAttachment(id, fileId)

  refresh()
}
