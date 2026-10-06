import type { Employee, HierarchyLevel, TrackingData } from "@/lib/types"

export function selectableRoles(hierarchy: HierarchyLevel[]): string[] {
  return hierarchy.filter((level) => level.level > 1).map((level) => level.role)
}

export function nextEmployeeId(employees: Pick<Employee, "id">[]): string {
  const highest = employees.reduce((max, employee) => {
    const value = Number.parseInt(employee.id.replace(/\D/g, ""), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `E${highest + 1}`
}

export interface EmployeeChange {
  id?: string
  name: string
  role: string
  department: string
}

export function applyEmployeeInput(
  employees: Employee[],
  change: EmployeeChange,
  newId: () => string
): { ok: true; id: string } | { ok: false; error: string } {
  const existing = change.id
    ? employees.find((e) => e.id === change.id)
    : undefined
  if (change.id && !existing) return { ok: false, error: "Person not found" }

  const clash = employees.some(
    (e) =>
      e.id !== change.id && e.name.toLowerCase() === change.name.toLowerCase()
  )
  if (clash) {
    return { ok: false, error: "A person with this name already exists" }
  }

  const employee: Employee = existing ?? {
    id: newId(),
    name: "",
    role: "",
    department: "",
  }
  employee.name = change.name
  employee.role = change.role
  employee.department = change.department
  if (!existing) employees.push(employee)
  return { ok: true, id: employee.id }
}

export function removalBlockReason(
  data: Pick<TrackingData, "tasks" | "dailyReports">,
  id: string
): string | null {
  const tasks = data.tasks.filter((task) => task.assignedTo === id).length
  if (tasks > 0) {
    return `This person has ${tasks} task${tasks === 1 ? "" : "s"} assigned. Reassign or remove them first.`
  }
  const reports = data.dailyReports.filter((r) => r.employeeId === id).length
  if (reports > 0) {
    return "This person has daily reports recorded and cannot be removed."
  }
  return null
}
