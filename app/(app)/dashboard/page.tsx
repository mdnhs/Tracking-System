import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards, type SectionCardData } from "@/components/section-cards"
import { StatusBadge } from "@/components/status-badge"
import { TaskCreateSheet } from "@/components/task-create-sheet"
import { TaskStatusCard } from "@/components/task-status-card"
import { TaskTable } from "@/components/task-table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { completionTrend } from "@/lib/analytics"
import { countTasks } from "@/lib/data"
import { formatDate, todayISO } from "@/lib/format"
import { reportsForDate } from "@/lib/reports"
import { requireManagement } from "@/lib/session"
import { needsAttention } from "@/lib/tasks"

export default async function DashboardPage() {
  const { data, all } = await requireManagement()
  const today = todayISO()
  const counts = countTasks(data.tasks, today)
  const attention = needsAttention(data.tasks, today)
  const employeeName = new Map(all.employees.map((e) => [e.id, e.name]))

  const todayReports = reportsForDate(data.dailyReports, data.employees, today)
  const morningSubmitted = todayReports.filter(
    (r) => r.morning.submitted
  ).length
  const eveningSubmitted = todayReports.filter(
    (r) => r.evening.submitted
  ).length

  const cards: SectionCardData[] = [
    {
      label: "Total Employees",
      value: data.employees.length,
      footer: "Team members tracked",
    },
    {
      label: "Active Tasks",
      value: counts.active,
      footer: "Excluding cancelled",
    },
    {
      label: "Completed Today",
      value: counts.completedToday,
      badge: "On track",
      trend: "up",
      footer: `${counts.completed} completed overall`,
    },
    {
      label: "In Progress",
      value: counts.inProgress,
      footer: "Work currently underway",
    },
    {
      label: "Pending",
      value: counts.pending,
      footer: "Assigned, not yet started",
    },
    {
      label: "Overdue",
      value: counts.overdue,
      badge: "Attention",
      trend: "down",
      footer: "Deadline has passed",
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppHeader
          description={`${data.meta.company} · ${data.meta.tagline}`}
          live
        />
        <TaskCreateSheet employees={data.employees} />
      </div>

      <SectionCards cards={cards} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TaskStatusCard counts={counts} />

        <div className="lg:col-span-2">
          <ChartAreaInteractive
            data={completionTrend(data.tasks, today).map((t) => ({
              week: formatDate(t.week),
              completed: t.completed,
            }))}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-4">
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>
              Overdue work, then open tasks due within two days
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {attention.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                Nothing needs attention right now.
              </p>
            ) : (
              <ul className="divide-y">
                {attention.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employeeName.get(task.assignedTo) ?? task.assignedTo}
                          {" · Due "}
                          {formatDate(task.deadline)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Reports Today</CardTitle>
            <CardDescription>
              Submission progress for {formatDate(today)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ReportMeter
              icon={Sun03Icon}
              label="Morning"
              submitted={morningSubmitted}
              target={data.employees.length}
            />
            <ReportMeter
              icon={Moon02Icon}
              label="Evening"
              submitted={eveningSubmitted}
              target={data.employees.length}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="py-4">
        <CardHeader>
          <CardTitle>Task Register</CardTitle>
          <CardDescription>
            Filter, search and review every task record
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-6">
            <TaskTable tasks={data.tasks} employees={all.employees} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Management Visibility</CardTitle>
          <CardDescription>
            Seven questions, answered immediately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.visibilityQuestions.map((q) => (
              <li
                key={q.key}
                className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <Badge variant="secondary" className="mt-px shrink-0 font-mono">
                  {q.key}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {q.question}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

function ReportMeter({
  icon,
  label,
  submitted,
  target,
}: {
  icon: typeof Sun03Icon
  label: string
  submitted: number
  target: number
}) {
  const pct = target === 0 ? 0 : Math.round((submitted / target) * 100)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <HugeiconsIcon
            icon={icon}
            className="size-4 text-muted-foreground"
            strokeWidth={2}
          />
          {label}
        </span>
        <span className="font-medium tabular-nums">
          {submitted} / {target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% submitted</p>
    </div>
  )
}
