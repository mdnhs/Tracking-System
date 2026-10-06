"use server"

import { revalidatePath } from "next/cache"

import {
  applyEmployeeInput,
  nextEmployeeId,
  removalBlockReason,
  selectableRoles,
} from "@/lib/employees"
import { employeeSchema, type EmployeeValues } from "@/lib/schemas"
import { getSession } from "@/lib/session"
import { mutate } from "@/lib/store"

export interface OrganizationResult {
  ok: boolean
  error?: string
  id?: string
}

const NOT_ALLOWED: OrganizationResult = {
  ok: false,
  error: "Only the Managing Director can manage the organization.",
}

async function isMD(): Promise<boolean> {
  return (await getSession()).user.role === "MD"
}

export async function saveEmployee(
  values: EmployeeValues
): Promise<OrganizationResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = employeeSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const input = parsed.data

  const result = await mutate((data) => {
    if (!selectableRoles(data.hierarchy).includes(input.role)) {
      return { ok: false as const, error: "Choose a valid role" }
    }
    return applyEmployeeInput(
      data.employees,
      {
        id: input.id,
        name: input.name,
        role: input.role,
        department: input.department,
      },
      () => nextEmployeeId(data.employees)
    )
  })

  if (!result.ok) return result
  revalidatePath("/", "layout")
  return { ok: true, id: result.id }
}

export async function deleteEmployee(id: string): Promise<OrganizationResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const result = await mutate((data) => {
    const reason = removalBlockReason(data, id)
    if (reason) return { ok: false as const, error: reason }
    const before = data.employees.length
    data.employees = data.employees.filter((employee) => employee.id !== id)
    if (data.employees.length === before) {
      return { ok: false as const, error: "Person not found" }
    }
    return { ok: true as const }
  })

  if (!result.ok) return result
  revalidatePath("/", "layout")
  return { ok: true }
}
