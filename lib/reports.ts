import type { DailyReport, Employee } from "@/lib/types"

export function emptyReport(employeeId: string, date: string): DailyReport {
  return {
    date,
    employeeId,
    morning: {
      submitted: false,
      priorities: [],
      plannedWork: [],
      importantTasks: [],
      blockers: [],
    },
    evening: {
      submitted: false,
      completed: [],
      ongoing: [],
      pending: [],
      problems: "",
      incompleteReason: "",
    },
  }
}

export function findReport(
  reports: DailyReport[],
  employeeId: string,
  date: string
): DailyReport | undefined {
  return reports.find((r) => r.employeeId === employeeId && r.date === date)
}

export function reportsForDate(
  reports: DailyReport[],
  employees: Employee[],
  date: string
): DailyReport[] {
  return employees.map(
    (e) => findReport(reports, e.id, date) ?? emptyReport(e.id, date)
  )
}

export function upsertReport(
  reports: DailyReport[],
  employeeId: string,
  date: string
): DailyReport {
  const existing = findReport(reports, employeeId, date)
  if (existing) return existing
  const report = emptyReport(employeeId, date)
  reports.push(report)
  return report
}
