import type { Employee, Task, TaskStatusKey, TrackingData } from "@/lib/types"

export const MD_USER: Employee = {
  id: "MD",
  name: "Managing Director",
  role: "MD",
  department: "Management",
}

type Scope = "all" | "department" | "self"

const DEPARTMENT_ROLES = ["Manager", "HR", "Other Responsible"]

function scopeOf(user: Employee): Scope {
  if (user.role === "MD" || user.role === "Operation Head") return "all"
  if (DEPARTMENT_ROLES.includes(user.role)) return "department"
  return "self"
}

export function isManagement(user: Employee): boolean {
  return scopeOf(user) !== "self"
}

export function canSeeEmployee(user: Employee, employee: Employee): boolean {
  const scope = scopeOf(user)
  if (scope === "all") return true
  if (scope === "department") return employee.department === user.department
  return employee.id === user.id
}

export function canSeeTask(
  user: Employee,
  task: Task,
  employees: Employee[]
): boolean {
  if (task.assignedTo === user.id) return true
  const scope = scopeOf(user)
  if (scope === "all") return true
  if (scope === "self") return false
  const assignee = employees.find((e) => e.id === task.assignedTo)
  return (
    task.department === user.department ||
    assignee?.department === user.department
  )
}

export function canAssignTo(user: Employee, employee: Employee): boolean {
  return isManagement(user) && canSeeEmployee(user, employee)
}

export function canManageTask(
  user: Employee,
  task: Task,
  employees: Employee[]
): boolean {
  return isManagement(user) && canSeeTask(user, task, employees)
}

export function canWorkOnTask(
  user: Employee,
  task: Task,
  employees: Employee[]
): boolean {
  return task.assignedTo === user.id || canManageTask(user, task, employees)
}

export function canSetStatus(
  user: Employee,
  task: Task,
  to: TaskStatusKey,
  employees: Employee[]
): boolean {
  return to === "cancelled"
    ? canManageTask(user, task, employees)
    : canWorkOnTask(user, task, employees)
}

export function scopeData(data: TrackingData, user: Employee): TrackingData {
  const employees = data.employees.filter((e) => canSeeEmployee(user, e))
  const visible = new Set(employees.map((e) => e.id))
  return {
    ...data,
    employees,
    tasks: data.tasks.filter((t) => canSeeTask(user, t, data.employees)),
    dailyReports: data.dailyReports.filter((r) => visible.has(r.employeeId)),
  }
}
