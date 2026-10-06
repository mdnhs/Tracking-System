import assert from "node:assert/strict"
import { test } from "node:test"

import {
  applyEmployeeInput,
  nextEmployeeId,
  removalBlockReason,
  selectableRoles,
} from "@/lib/employees"
import type { Employee, HierarchyLevel, TrackingData } from "@/lib/types"

const hierarchy: HierarchyLevel[] = [
  { role: "MD / Managing Director", level: 1, responsibility: "" },
  { role: "Operation Head", level: 2, responsibility: "" },
  { role: "Manager", level: 3, responsibility: "" },
  { role: "HR", level: 3, responsibility: "" },
  { role: "Employee", level: 4, responsibility: "" },
]

function baseEmployees(): Employee[] {
  return [
    {
      id: "E1",
      name: "Declan Murphy",
      role: "Operation Head",
      department: "Operations",
    },
    { id: "E2", name: "Aoife Byrne", role: "Employee", department: "Design" },
  ]
}

const change = { name: "Niamh Kelly", role: "Manager", department: "Sales" }

test("selectableRoles drops the MD level", () => {
  assert.deepEqual(selectableRoles(hierarchy), [
    "Operation Head",
    "Manager",
    "HR",
    "Employee",
  ])
})

test("nextEmployeeId continues the sequence", () => {
  assert.equal(nextEmployeeId(baseEmployees()), "E3")
  assert.equal(nextEmployeeId([]), "E1")
  assert.equal(nextEmployeeId([{ id: "E10" }]), "E11")
})

test("applyEmployeeInput adds a person", () => {
  const employees = baseEmployees()
  const result = applyEmployeeInput(employees, change, () => "E3")
  assert.deepEqual(result, { ok: true, id: "E3" })
  assert.deepEqual(employees.at(-1), { id: "E3", ...change })
})

test("applyEmployeeInput edits a person", () => {
  const employees = baseEmployees()
  const result = applyEmployeeInput(
    employees,
    { ...change, id: "E2" },
    () => "unused"
  )
  assert.deepEqual(result, { ok: true, id: "E2" })
  assert.deepEqual(employees[1], { id: "E2", ...change })
})

test("applyEmployeeInput rejects an unknown id and a duplicate name", () => {
  const employees = baseEmployees()
  assert.deepEqual(
    applyEmployeeInput(employees, { ...change, id: "E9" }, () => "E3"),
    { ok: false, error: "Person not found" }
  )
  assert.deepEqual(
    applyEmployeeInput(employees, { ...change, name: "aoife byrne" }, () => "E3"),
    { ok: false, error: "A person with this name already exists" }
  )
})

test("removalBlockReason stops a person with work", () => {
  const tasks = {
    tasks: [{ assignedTo: "E1" }],
    dailyReports: [],
  } as unknown as Pick<TrackingData, "tasks" | "dailyReports">
  assert.match(removalBlockReason(tasks, "E1") ?? "", /1 task/)
  assert.equal(removalBlockReason(tasks, "E2"), null)

  const reports = {
    tasks: [],
    dailyReports: [{ employeeId: "E2" }],
  } as unknown as Pick<TrackingData, "tasks" | "dailyReports">
  assert.match(removalBlockReason(reports, "E2") ?? "", /daily reports/)
})
