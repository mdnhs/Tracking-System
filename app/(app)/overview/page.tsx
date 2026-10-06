import { Download04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { LineChart } from "@/components/charts/line-chart"
import {
  DepartmentActivityTable,
  EmployeeActivityTable,
} from "@/components/overview-tables"
import { PrintButton } from "@/components/print-button"
import { SectionCards, type SectionCardData } from "@/components/section-cards"
import { TaskTable } from "@/components/task-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate, todayISO } from "@/lib/format"
import { PERIODS, buildOverview, isPeriod } from "@/lib/overview"
import { requireManagement } from "@/lib/session"

const PERIOD_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
} as const

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: requested } = await searchParams
  const period = isPeriod(requested) ? requested : "weekly"
  const { data, all } = await requireManagement()
  const overview = buildOverview(data, period, todayISO())
  const { summary } = overview

  const cards: SectionCardData[] = [
    {
      label: "Tasks Assigned",
      value: summary.assigned,
      footer: "Started in this period",
    },
    {
      label: "Tasks Completed",
      value: summary.completed,
      badge: `${summary.completedLate} late`,
      trend: summary.completedLate > 0 ? "down" : "up",
      footer: `${summary.completedOnTime} completed on time`,
    },
    {
      label: "Open Right Now",
      value: summary.pendingNow + summary.inProgressNow,
      footer: `${summary.pendingNow} pending · ${summary.inProgressNow} in progress`,
    },
    {
      label: "Overdue Right Now",
      value: summary.overdueNow,
      badge: summary.overdueNow > 0 ? "Attention" : undefined,
      trend: "down",
      footer: "Deadline has passed",
    },
    {
      label: "Morning Reports",
      value: summary.morningReports,
      footer: `Across ${data.employees.length} employees`,
    },
    {
      label: "Evening Reports",
      value: summary.eveningReports,
      footer: `Across ${data.employees.length} employees`,
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppHeader
          description={`${PERIOD_LABELS[period]} overview · ${formatDate(overview.from)} – ${formatDate(overview.to)}`}
        />
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex rounded-lg border p-0.5">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === period ? "secondary" : "ghost"}
                nativeButton={false}
                render={<Link href={`/overview?period=${p}`} />}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/overview/export?period=${period}`} download />}
          >
            <HugeiconsIcon
              icon={Download04Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Export CSV
          </Button>
          <PrintButton />
        </div>
      </div>

      <SectionCards cards={cards} />

      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-5 pb-4">
          <CardTitle>Employee Activity</CardTitle>
          <CardDescription>
            Work and daily reporting per employee in this period
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <EmployeeActivityTable rows={overview.employees} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="px-6 pt-5 pb-4">
            <CardTitle>Department Activity</CardTitle>
            <CardDescription>Assigned and completed per team</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <DepartmentActivityTable rows={overview.departments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delay Reasons</CardTitle>
            <CardDescription>
              Across the delayed work listed below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.delayReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delay reasons recorded in this period.
              </p>
            ) : (
              overview.delayReasons.map((d) => (
                <div
                  key={d.reason}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{d.reason}</span>
                  <span className="font-medium tabular-nums">
                    {d.count} · {d.percent}%
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-5 pb-4">
          <CardTitle>Delayed Work</CardTitle>
          <CardDescription>
            Overdue now, or completed late in this period
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <TaskTable
            tasks={overview.delayed}
            employees={all.employees}
            columns={[
              "title",
              "assignedTo",
              "deadline",
              "delayReason",
              "status",
            ]}
            statusFilter={false}
            emptyMessage="No delayed work."
          />
        </CardContent>
      </Card>

      {overview.trend.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Completion Trend</CardTitle>
            <CardDescription>Tasks completed per week</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={overview.trend.map((t) => ({
                label: formatDate(t.week),
                value: t.completed,
              }))}
              yLabel="Tasks completed per week"
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
