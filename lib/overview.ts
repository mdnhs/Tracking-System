import {
  completionTrend,
  delayAnalysis,
  inRange,
  weekStart,
} from "@/lib/analytics"
import { completionTiming } from "@/lib/tasks"
import type { DelayEntry, Task, TrackingData, TrendEntry } from "@/lib/types"

export const PERIODS = ["daily", "weekly", "monthly"] as const
export type Period = (typeof PERIODS)[number]

export function isPeriod(value: string | undefined): value is Period {
  return PERIODS.includes(value as Period)
}

export function periodRange(
  period: Period,
  today: string
): { from: string; to: string } {
  if (period === "daily") return { from: today, to: today }
  if (period === "weekly") return { from: weekStart(today), to: today }
  return { from: today.slice(0, 8) + "01", to: today }
}

export interface EmployeeActivity {
  id: string
  name: string
  department: string
  assigned: number
  completed: number
  openNow: number
  overdueNow: number
  morningReports: number
  eveningReports: number
}

export interface DepartmentActivity {
  department: string
  assigned: number
  completed: number
  overdueNow: number
}

export interface Overview {
  period: Period
  from: string
  to: string
  summary: {
    assigned: number
    completed: number
    completedOnTime: number
    completedLate: number
    pendingNow: number
    inProgressNow: number
    overdueNow: number
    morningReports: number
    eveningReports: number
  }
  employees: EmployeeActivity[]
  departments: DepartmentActivity[]
  delayed: Task[]
  delayReasons: DelayEntry[]
  trend: TrendEntry[]
}

function isDelayed(task: Task, from: string, to: string): boolean {
  if (task.status === "overdue") return true
  return (
    completionTiming(task) === "late" && inRange(task.completedAt, from, to)
  )
}

export function buildOverview(
  data: Pick<TrackingData, "tasks" | "employees" | "dailyReports">,
  period: Period,
  today: string
): Overview {
  const { from, to } = periodRange(period, today)
  const tasks = data.tasks.filter((t) => t.status !== "cancelled")
  const assigned = (t: Task) => inRange(t.startDate, from, to)
  const completed = (t: Task) =>
    t.status === "completed" && inRange(t.completedAt, from, to)
  const reportsInRange = data.dailyReports.filter((r) =>
    inRange(r.date, from, to)
  )
  const delayed = tasks.filter((t) => isDelayed(t, from, to))

  const employees = data.employees.map((e) => {
    const mine = tasks.filter((t) => t.assignedTo === e.id)
    const reports = reportsInRange.filter((r) => r.employeeId === e.id)
    return {
      id: e.id,
      name: e.name,
      department: e.department,
      assigned: mine.filter(assigned).length,
      completed: mine.filter(completed).length,
      openNow: mine.filter(
        (t) => t.status === "pending" || t.status === "in-progress"
      ).length,
      overdueNow: mine.filter((t) => t.status === "overdue").length,
      morningReports: reports.filter((r) => r.morning.submitted).length,
      eveningReports: reports.filter((r) => r.evening.submitted).length,
    }
  })

  const departmentNames = [...new Set(tasks.map((t) => t.department))].sort()
  const departments = departmentNames.map((department) => {
    const owned = tasks.filter((t) => t.department === department)
    return {
      department,
      assigned: owned.filter(assigned).length,
      completed: owned.filter(completed).length,
      overdueNow: owned.filter((t) => t.status === "overdue").length,
    }
  })

  const completedInRange = tasks.filter(completed)
  const weeks =
    (Date.parse(weekStart(to)) - Date.parse(weekStart(from))) /
      (7 * 86_400_000) +
    1

  return {
    period,
    from,
    to,
    summary: {
      assigned: tasks.filter(assigned).length,
      completed: completedInRange.length,
      completedOnTime: completedInRange.filter(
        (t) => completionTiming(t) === "on-time"
      ).length,
      completedLate: completedInRange.filter(
        (t) => completionTiming(t) === "late"
      ).length,
      pendingNow: tasks.filter((t) => t.status === "pending").length,
      inProgressNow: tasks.filter((t) => t.status === "in-progress").length,
      overdueNow: tasks.filter((t) => t.status === "overdue").length,
      morningReports: reportsInRange.filter((r) => r.morning.submitted).length,
      eveningReports: reportsInRange.filter((r) => r.evening.submitted).length,
    },
    employees,
    departments,
    delayed,
    delayReasons: delayAnalysis(delayed),
    trend: completionTrend(tasks, to, weeks),
  }
}

export function overviewCsv(overview: Overview): string {
  const rows: (string | number)[][] = [
    ["Report", `${overview.period} overview`],
    ["From", overview.from],
    ["To", overview.to],
    [],
    ["Summary"],
    ["Tasks assigned", overview.summary.assigned],
    ["Tasks completed", overview.summary.completed],
    ["Completed on time", overview.summary.completedOnTime],
    ["Completed late", overview.summary.completedLate],
    ["Pending (now)", overview.summary.pendingNow],
    ["In progress (now)", overview.summary.inProgressNow],
    ["Overdue (now)", overview.summary.overdueNow],
    ["Morning reports submitted", overview.summary.morningReports],
    ["Evening reports submitted", overview.summary.eveningReports],
    [],
    ["Employee activity"],
    [
      "Employee",
      "Department",
      "Assigned",
      "Completed",
      "Open now",
      "Overdue now",
      "Morning reports",
      "Evening reports",
    ],
    ...overview.employees.map((e) => [
      e.name,
      e.department,
      e.assigned,
      e.completed,
      e.openNow,
      e.overdueNow,
      e.morningReports,
      e.eveningReports,
    ]),
    [],
    ["Department activity"],
    ["Department", "Assigned", "Completed", "Overdue now"],
    ...overview.departments.map((d) => [
      d.department,
      d.assigned,
      d.completed,
      d.overdueNow,
    ]),
    [],
    ["Delayed tasks"],
    ["Task", "Title", "Assigned to", "Deadline", "Status", "Delay reason"],
    ...overview.delayed.map((t) => [
      t.id,
      t.title,
      t.assignedTo,
      t.deadline,
      t.status,
      t.delayReason ?? "",
    ]),
    [],
    ["Delay reasons"],
    ["Reason", "Count", "Share %"],
    ...overview.delayReasons.map((d) => [d.reason, d.count, d.percent]),
  ]
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
}

function csvCell(value: string | number): string {
  // Leading = + - @ would run as a formula when the file is opened in Excel.
  const text =
    typeof value === "string" ? value.replace(/^[=+\-@]/, "'$&") : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
