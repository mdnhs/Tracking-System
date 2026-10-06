"use client"

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  PlayIcon,
  TaskDone01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { acceptAssignedTask, setTaskStatus } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"
import {
  DelayReasonForm,
  HoldForm,
  ReassignForm,
  UpdateForm,
} from "@/components/task-forms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  canAccept,
  canTransition,
  isPastDeadline,
  needsDelayReason,
} from "@/lib/tasks"
import type { Employee, Task } from "@/lib/types"

function StatusForm({
  id,
  status,
  children,
  variant = "outline",
}: {
  id: string
  status: string
  children: React.ReactNode
  variant?: React.ComponentProps<typeof SubmitButton>["variant"]
}) {
  return (
    <form action={setTaskStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton size="sm" variant={variant} pendingLabel="Updating…">
        {children}
      </SubmitButton>
    </form>
  )
}

export function TaskActions({
  task,
  delayReasons,
  today,
  canManage,
  isAssignee,
  assignees,
}: {
  task: Task
  delayReasons: string[]
  today: string
  canManage: boolean
  isAssignee: boolean
  assignees: Employee[]
}) {
  const canStart = canTransition(task, "in-progress", today)
  const canComplete = canTransition(task, "completed", today)
  const canHold = canTransition(task, "on-hold", today)
  const canCancel = canManage && canTransition(task, "cancelled", today)
  const reasonRequired = needsDelayReason(task, today)

  const showAccept = isAssignee && canAccept(task)
  const hasTransitions = showAccept || canStart || canComplete || canCancel
  const isOpen = task.status !== "completed" && task.status !== "cancelled"
  const reassignItems = assignees
    .filter((e) => e.id !== task.assignedTo)
    .map((e) => ({ value: e.id, label: `${e.name} · ${e.role}` }))
  const showDelayForm = isOpen && isPastDeadline(task, today)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Actions</CardTitle>
        <CardDescription>Move the work through its lifecycle</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasTransitions ? (
          <div className="flex flex-wrap gap-2">
            {showAccept ? (
              <form action={acceptAssignedTask}>
                <input type="hidden" name="id" value={task.id} />
                <SubmitButton size="sm" pendingLabel="Accepting…">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Accept task
                </SubmitButton>
              </form>
            ) : null}
            {canStart ? (
              <StatusForm id={task.id} status="in-progress" variant="default">
                <HugeiconsIcon
                  icon={PlayIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                {task.status === "on-hold" ? "Resume" : "Start work"}
              </StatusForm>
            ) : null}
            {canComplete ? (
              <StatusForm id={task.id} status="completed" variant="default">
                <HugeiconsIcon
                  icon={TaskDone01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Mark Complete
              </StatusForm>
            ) : null}
            {canCancel ? (
              <StatusForm id={task.id} status="cancelled">
                <HugeiconsIcon
                  icon={CancelCircleIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Cancel
              </StatusForm>
            ) : null}
          </div>
        ) : isOpen ? null : (
          <p className="text-sm text-muted-foreground">
            This task is closed — no further actions available.
          </p>
        )}

        {!task.acceptedAt && !isAssignee && canAccept(task) ? (
          <p className="text-xs text-muted-foreground">
            Waiting for the assigned person to accept this task.
          </p>
        ) : null}

        {reasonRequired ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            <HugeiconsIcon
              icon={Alert02Icon}
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={2}
            />
            The deadline has passed. Record a delay reason before completing.
          </p>
        ) : null}

        {canHold ? (
          <div className="border-t pt-4">
            <HoldForm taskId={task.id} />
          </div>
        ) : null}

        {canManage && isOpen && reassignItems.length > 0 ? (
          <div className="border-t pt-4">
            <ReassignForm taskId={task.id} assignees={reassignItems} />
          </div>
        ) : null}

        {showDelayForm ? (
          <div className="border-t pt-4">
            <DelayReasonForm
              taskId={task.id}
              reasons={delayReasons}
              defaultValues={{
                reason: task.delayReason ?? "",
                explanation: task.delayExplanation ?? "",
              }}
            />
          </div>
        ) : null}

        <div className="border-t pt-4">
          <UpdateForm taskId={task.id} />
        </div>
      </CardContent>
    </Card>
  )
}
