import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { ReportDateForm } from "@/components/report-date-form"
import { ReportGroup } from "@/components/report-group"
import { Avatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { addDays } from "@/lib/analytics"
import { formatDate, todayISO } from "@/lib/format"
import { reportsForDate } from "@/lib/reports"
import { requireManagement } from "@/lib/session"
import type { DailyReport, Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { data } = await requireManagement()
  const today = todayISO()
  const { date: requested } = await searchParams
  const date =
    requested && ISO_DATE.test(requested) && requested <= today
      ? requested
      : today
  const isToday = date === today
  const dayLabel = isToday ? "Today's" : formatDate(date)
  const employeeById = new Map(data.employees.map((e) => [e.id, e]))
  const reports = reportsForDate(data.dailyReports, data.employees, date)
  const target = data.employees.length

  const morningSubmitted = reports.filter((r) => r.morning.submitted).length
  const eveningSubmitted = reports.filter((r) => r.evening.submitted).length
  const missingMorning = reports.filter((r) => !r.morning.submitted)
  const missingEvening = reports.filter((r) => !r.evening.submitted)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppHeader
          description={`Plan the day, then report the result · ${formatDate(date)}`}
          live={isToday}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            nativeButton={false}
            render={<Link href={`/reports?date=${addDays(date, -1)}`} />}
            aria-label="Previous day"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <ReportDateForm date={date} max={today} />
          {isToday ? null : (
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              nativeButton={false}
              render={<Link href={`/reports?date=${addDays(date, 1)}`} />}
              aria-label="Next day"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Sun03Icon}
                className="size-4 text-amber-500"
                strokeWidth={2}
              />
              Morning Report — {dayLabel} Plan
            </CardTitle>
            <CardDescription>
              {morningSubmitted} of {target} employees submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${(morningSubmitted / target) * 100}%` }}
              />
            </div>
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
              End-of-Day Report — {dayLabel} Result
            </CardTitle>
            <CardDescription>
              {eveningSubmitted} of {target} employees submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${(eveningSubmitted / target) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {missingMorning.length > 0 || missingEvening.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <HugeiconsIcon
                icon={Alert02Icon}
                className="size-4"
                strokeWidth={2}
              />
              Not yet reported
            </CardTitle>
            <CardDescription>
              Management can instantly tell who has not submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MissingList
              label="Morning"
              reports={missingMorning}
              employeeById={employeeById}
            />
            <MissingList
              label="Evening"
              reports={missingEvening}
              employeeById={employeeById}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => {
          const emp = employeeById.get(report.employeeId)
          if (!emp) return null
          return (
            <Card key={report.employeeId}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={emp.name} seed={emp.id} />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{emp.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {emp.role} · {emp.department}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    <SubmissionDot
                      submitted={report.morning.submitted}
                      label="Morning"
                    />
                    <SubmissionDot
                      submitted={report.evening.submitted}
                      label="Evening"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportSection
                  icon={Sun03Icon}
                  tone="text-amber-500"
                  title={`${dayLabel} Plan`}
                  submitted={report.morning.submitted}
                >
                  {report.morning.submitted ? (
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
                  ) : null}
                </ReportSection>

                <ReportSection
                  icon={Moon02Icon}
                  tone="text-indigo-500"
                  title={`${dayLabel} Result`}
                  submitted={report.evening.submitted}
                >
                  {report.evening.submitted ? (
                    <div className="space-y-2">
                      {report.evening.completed.length > 0 ? (
                        <ResultRow
                          label="Completed"
                          items={report.evening.completed}
                          tone="success"
                        />
                      ) : null}
                      {report.evening.ongoing.length > 0 ? (
                        <ResultRow
                          label="Ongoing"
                          items={report.evening.ongoing}
                          tone="info"
                        />
                      ) : null}
                      {report.evening.pending.length > 0 ? (
                        <ResultRow
                          label="Pending"
                          items={report.evening.pending}
                          tone="warning"
                        />
                      ) : null}
                      {report.evening.problems ? (
                        <p className="text-xs text-muted-foreground">
                          Problems: {report.evening.problems}
                        </p>
                      ) : null}
                      {report.evening.incompleteReason ? (
                        <p className="text-xs text-muted-foreground">
                          Reason for incomplete:{" "}
                          {report.evening.incompleteReason}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </ReportSection>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function MissingList({
  label,
  reports,
  employeeById,
}: {
  label: string
  reports: DailyReport[]
  employeeById: Map<string, Employee>
}) {
  if (reports.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {reports.map((r) => (
        <Badge
          key={r.employeeId}
          variant="warning"
          className="gap-1.5 px-2.5 py-1"
        >
          {employeeById.get(r.employeeId)?.name ?? r.employeeId}
        </Badge>
      ))}
    </div>
  )
}

function SubmissionDot({
  submitted,
  label,
}: {
  submitted: boolean
  label: string
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        submitted
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border text-muted-foreground"
      )}
    >
      {submitted ? (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="size-3"
          strokeWidth={2}
        />
      ) : null}
      {label}
    </span>
  )
}

function ReportSection({
  icon,
  tone,
  title,
  submitted,
  children,
}: {
  icon: typeof Sun03Icon
  tone: string
  title: string
  submitted: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-muted/30 p-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <HugeiconsIcon
          icon={icon}
          className={cn("size-3.5", tone)}
          strokeWidth={2}
        />
        {title}
      </h3>
      <div className="mt-2">
        {submitted ? (
          children
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Not submitted yet
          </p>
        )}
      </div>
    </section>
  )
}

function ResultRow({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "success" | "info" | "warning"
}) {
  const tones = {
    success: "text-emerald-600 dark:text-emerald-400",
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-amber-600 dark:text-amber-400",
  }
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "w-24 shrink-0 text-xs font-semibold tracking-wide uppercase",
          tones[tone]
        )}
      >
        {label}
      </span>
      <span className="text-muted-foreground">{items.join(", ")}</span>
    </div>
  )
}
