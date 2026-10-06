import {
  Alert02Icon,
  ArrowLeft01Icon,
  Attachment01Icon,
  Briefcase01Icon,
  Calendar03Icon,
  Comment01Icon,
  Flag02Icon,
  PauseCircleIcon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  PriorityBadge,
  StatusBadge,
  TimingBadge,
} from "@/components/status-badge"
import { TaskActions } from "@/components/task-actions"
import { TaskAttachments } from "@/components/task-attachments"
import { Avatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/data"
import { todayISO } from "@/lib/format"
import { canManageTask, canWorkOnTask } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import { completionTiming, isPastDeadline } from "@/lib/tasks"
import { cn } from "@/lib/utils"

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, data, all } = await getSession()
  const task = data.tasks.find((t) => t.id === id)
  if (!task) notFound()

  const employee = all.employees.find((e) => e.id === task.assignedTo)
  const canWork = canWorkOnTask(user, task, all.employees)
  const canManage = canManageTask(user, task, all.employees)
  const today = todayISO()
  const timing = completionTiming(task)

  const steps = ["Created", "Assigned", "Accepted", "In Progress", "Completed"]
  const started =
    task.status === "in-progress" ||
    task.status === "on-hold" ||
    (task.status === "overdue" && Boolean(task.acceptedAt))
  const activeStep =
    task.status === "completed" ? 4 : started ? 3 : task.acceptedAt ? 2 : 1

  const isCompleted = task.status === "completed"
  const showOverdueBranch =
    task.status !== "cancelled" &&
    (isCompleted ? timing === "late" : isPastDeadline(task, today))
  const branchSteps = [
    { label: "Deadline Passed", done: true, awaiting: false },
    { label: "Overdue", done: true, awaiting: false },
    {
      label: "Delay Reason",
      done: Boolean(task.delayReason),
      awaiting: !task.delayReason,
    },
    { label: "Completed", done: isCompleted, awaiting: !isCompleted },
  ]

  return (
    <>
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon
          icon={ArrowLeft01Icon}
          className="size-4"
          strokeWidth={2}
        />
        Back to tasks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            {task.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {task.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {timing ? <TimingBadge timing={timing} /> : null}
        </div>
      </div>

      {task.status === "on-hold" && task.holdReason ? (
        <p className="flex items-start gap-2 rounded-lg border border-violet-500/40 bg-violet-500/5 px-3 py-2 text-sm text-violet-700 dark:text-violet-300">
          <HugeiconsIcon
            icon={PauseCircleIcon}
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={2}
          />
          On hold: {task.holdReason}
        </p>
      ) : null}

      <Card className="gap-0 py-0">
        <CardContent className="px-6 py-5">
          <ol className="flex flex-wrap items-center gap-y-2">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center">
                <span
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    i <= activeStep
                      ? "font-medium text-foreground"
                      : "text-muted-foreground/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-xs",
                      i < activeStep
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : i === activeStep
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground/60"
                    )}
                  >
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < steps.length - 1 ? (
                  <span
                    className={cn(
                      "mx-2 h-px w-6 sm:w-10",
                      i < activeStep ? "bg-emerald-500/60" : "bg-border"
                    )}
                  />
                ) : null}
              </li>
            ))}
          </ol>

          {showOverdueBranch ? (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2.5 text-xs font-medium tracking-wide text-red-600 uppercase dark:text-red-400">
                Deadline passed — overdue branch
              </p>
              <ol className="flex flex-wrap items-center gap-y-2">
                {branchSteps.map((step, i) => (
                  <li key={step.label} className="flex items-center">
                    <span
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        step.done
                          ? "font-medium text-foreground"
                          : step.awaiting
                            ? "text-muted-foreground"
                            : "text-red-600 dark:text-red-400"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border text-xs",
                          step.done
                            ? "border-red-500 bg-red-500/15 text-red-600 dark:text-red-400"
                            : step.awaiting
                              ? "border-dashed border-border text-muted-foreground"
                              : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {step.done ? "✓" : step.awaiting ? "…" : i + 1}
                      </span>
                      {step.label}
                    </span>
                    {i < branchSteps.length - 1 ? (
                      <span
                        className={cn(
                          "mx-2 h-px w-6 sm:w-10",
                          step.done ? "bg-red-500/60" : "bg-border"
                        )}
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-2.5 text-xs text-muted-foreground">
                {isCompleted
                  ? "Completed after the deadline."
                  : task.delayReason
                    ? "Delay reason recorded — task can still be completed."
                    : "Record a delay reason before completing the task."}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>One clear, consistent record</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail icon={UserCircle02Icon} label="Assigned person">
                <span className="flex items-center gap-2">
                  <Avatar
                    name={employee?.name ?? task.assignedTo}
                    seed={task.assignedTo}
                    className="size-6"
                  />
                  {employee?.name} · {employee?.role}
                </span>
              </Detail>
              <Detail icon={UserCircle02Icon} label="Assigned by">
                {task.assignedBy}
              </Detail>
              <Detail icon={Briefcase01Icon} label="Department / team">
                {task.department}
              </Detail>
              <Detail icon={Briefcase01Icon} label="Project / client">
                {task.project}
              </Detail>
              <Detail icon={Calendar03Icon} label="Start date">
                {formatDate(task.startDate)}
              </Detail>
              <Detail icon={Calendar03Icon} label="Deadline">
                {formatDate(task.deadline)}
              </Detail>
              <Detail icon={Attachment01Icon} label="Attachments">
                {task.attachments.length} file
                {task.attachments.length === 1 ? "" : "s"}
              </Detail>
              <Detail icon={Comment01Icon} label="Comments / updates">
                {task.comments}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canWork ? (
            <TaskActions
              task={task}
              delayReasons={data.settings.workflow.delayReasons}
              today={today}
              canManage={canManage}
              isAssignee={task.assignedTo === user.id}
              assignees={canManage ? data.employees : []}
            />
          ) : null}

          <TaskAttachments
            taskId={task.id}
            attachments={task.attachments}
            userName={user.name}
            canEdit={canWork}
            canManage={canManage}
          />

          {task.delayReason ? (
            <Card className="border-red-500/40 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    className="size-4"
                    strokeWidth={2}
                  />
                  Delay Reason
                </CardTitle>
                <CardDescription>Recorded before completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="danger">{task.delayReason}</Badge>
                {task.delayExplanation ? (
                  <p className="text-sm text-muted-foreground">
                    {task.delayExplanation}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Flag02Icon}
                    className="size-4 text-muted-foreground"
                    strokeWidth={2}
                  />
                  Deadline & Delay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {timing && task.completedAt
                    ? `Completed ${timing === "late" ? "late" : "on time"} on ${formatDate(task.completedAt)}.`
                    : task.status === "cancelled"
                      ? "Task cancelled — deadline no longer monitored."
                      : "Deadline is being monitored. If it passes, the task is flagged overdue and a reason is recorded."}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Updates</CardTitle>
              <CardDescription>
                {task.comments} comment{task.comments === 1 ? "" : "s"} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {task.updates && task.updates.length > 0 ? (
                <ul className="space-y-3">
                  {task.updates.map((update, index) => (
                    <li key={index} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {update.author}
                        </span>
                        <span>
                          {new Date(update.at).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1">{update.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No updates recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: typeof Calendar03Icon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}
