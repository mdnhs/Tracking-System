import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  HourglassIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { ReportForms } from "@/components/report-form"
import { ReportGroup } from "@/components/report-group"
import { TaskTable } from "@/components/task-table"
import { Avatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { todayISO } from "@/lib/format"
import { findReport } from "@/lib/reports"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const { user: requested } = await searchParams
  const { user, data } = await getSession()

  const employee =
    data.employees.find((e) => e.id === requested) ??
    data.employees.find((e) => e.id === user.id) ??
    data.employees[0]
  const isSelf = employee.id === user.id
  const myTasks = data.tasks.filter((t) => t.assignedTo === employee.id)
  const report = findReport(data.dailyReports, employee.id, todayISO())

  const pending = myTasks.filter((t) => t.status === "pending").length
  const completed = myTasks.filter((t) => t.status === "completed").length
  const overdue = myTasks.filter((t) => t.status === "overdue").length

  return (
    <>
      <AppHeader description="Employees see only what they need — their tasks and today's report." />

      {data.employees.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {data.employees.map((e) => (
            <Link
              key={e.id}
              href={`/employee?user=${e.id}`}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                e.id === employee.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Avatar name={e.name} seed={e.id} className="size-6" />
              {e.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar
              name={employee.name}
              seed={employee.id}
              className="size-11"
            />
            <div>
              <CardTitle>{employee.name}</CardTitle>
              <CardDescription>
                {employee.role} · {employee.department} · {employee.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={Sun03Icon}
          label="Today's Report"
          value={
            report?.evening.submitted
              ? "Evening done"
              : report?.morning.submitted
                ? "Morning done"
                : "Not submitted"
          }
          tone={report?.morning.submitted ? "success" : "muted"}
        />
        <SummaryCard
          icon={HourglassIcon}
          label="Pending Tasks"
          value={pending}
          tone="warning"
        />
        <SummaryCard
          icon={CheckmarkCircle02Icon}
          label="Completed Tasks"
          value={completed}
          tone="success"
        />
        <SummaryCard
          icon={Alert02Icon}
          label="Overdue Tasks"
          value={overdue}
          tone={overdue > 0 ? "danger" : "muted"}
        />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-5 pb-4">
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>{myTasks.length} assigned</CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <TaskTable
            tasks={myTasks}
            employees={data.employees}
            columns={["title", "priority", "deadline", "status"]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Sun03Icon}
                className="size-4 text-amber-500"
                strokeWidth={2}
              />
              Morning Report
            </CardTitle>
            <CardDescription>Today&apos;s plan</CardDescription>
          </CardHeader>
          <CardContent>
            {report?.morning.submitted ? (
              <div className="space-y-2">
                <ReportGroup
                  label="Priorities"
                  items={report.morning.priorities}
                />
                <ReportGroup
                  label="Planned Work"
                  items={report.morning.plannedWork}
                />
                <ReportGroup
                  label="Important Tasks"
                  items={report.morning.importantTasks}
                />
                {report.morning.blockers.length > 0 ? (
                  <ReportGroup
                    label="Blockers"
                    items={report.morning.blockers}
                    tone="warning"
                  />
                ) : null}
              </div>
            ) : (
              <Badge variant="muted">Not submitted</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Moon02Icon}
                className="size-4 text-indigo-500"
                strokeWidth={2}
              />
              Evening Report
            </CardTitle>
            <CardDescription>Today&apos;s result</CardDescription>
          </CardHeader>
          <CardContent>
            {report?.evening.submitted ? (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {report.evening.completed.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
                {report.evening.ongoing.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
                    {item}
                  </li>
                ))}
                {report.evening.pending.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
                {report.evening.incompleteReason ? (
                  <li className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      className="mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2}
                    />
                    Incomplete: {report.evening.incompleteReason}
                  </li>
                ) : null}
              </ul>
            ) : (
              <Badge variant="muted">Not submitted</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {isSelf ? (
        <ReportForms morning={report?.morning} evening={report?.evening} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only {employee.name} can submit their daily reports.
        </p>
      )}
    </>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sun03Icon
  label: string
  value: string | number
  tone: "success" | "warning" | "danger" | "muted"
}) {
  const tones = {
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/15 text-red-600 dark:text-red-400",
    muted: "bg-muted text-muted-foreground",
  }
  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tones[tone]
          )}
        >
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg leading-none font-semibold tabular-nums">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
