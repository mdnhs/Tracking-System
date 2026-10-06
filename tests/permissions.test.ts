import assert from "node:assert/strict"
import { test } from "node:test"

import {
  MD_USER,
  canAssignTo,
  canManageTask,
  canSeeTask,
  canSetStatus,
  canWorkOnTask,
  isManagement,
  scopeData,
} from "@/lib/permissions"

const emp = (id, role, department) => ({ id, name: id, role, department })
const opHead = emp("E1", "Operation Head", "Operations")
const manager = emp("E4", "Manager", "Sales")
const sales = emp("E5", "Employee", "Sales")
const design = emp("E2", "Employee", "Design")
const employees = [opHead, manager, sales, design]
const task = (assignedTo, department) => ({
  id: "T",
  assignedTo,
  department,
  status: "in-progress",
})

test("management roles", () => {
  assert.equal(isManagement(MD_USER), true)
  assert.equal(isManagement(opHead), true)
  assert.equal(isManagement(manager), true)
  assert.equal(isManagement(sales), false)
})

test("task visibility by scope", () => {
  const salesTask = task("E5", "Sales")
  const designTask = task("E2", "Design")
  assert.equal(canSeeTask(MD_USER, designTask, employees), true)
  assert.equal(canSeeTask(manager, salesTask, employees), true)
  assert.equal(canSeeTask(manager, designTask, employees), false)
  assert.equal(canSeeTask(sales, salesTask, employees), true)
  assert.equal(canSeeTask(sales, task("E4", "Sales"), employees), false)
})

test("assigning is limited to management within scope", () => {
  assert.equal(canAssignTo(MD_USER, design), true)
  assert.equal(canAssignTo(manager, sales), true)
  assert.equal(canAssignTo(manager, design), false)
  assert.equal(canAssignTo(sales, sales), false)
})

test("employees work on own tasks but cannot cancel", () => {
  const own = task("E5", "Sales")
  assert.equal(canWorkOnTask(sales, own, employees), true)
  assert.equal(canManageTask(sales, own, employees), false)
  assert.equal(canSetStatus(sales, own, "completed", employees), true)
  assert.equal(canSetStatus(sales, own, "cancelled", employees), false)
  assert.equal(canSetStatus(manager, own, "cancelled", employees), true)
  assert.equal(canWorkOnTask(design, own, employees), false)
})

test("scopeData trims tasks, employees and reports", () => {
  const data = {
    employees,
    tasks: [task("E5", "Sales"), task("E2", "Design")],
    dailyReports: [{ employeeId: "E5" }, { employeeId: "E2" }],
  }
  const scoped = scopeData(data, manager)
  assert.deepEqual(
    scoped.employees.map((e) => e.id),
    ["E4", "E5"]
  )
  assert.equal(scoped.tasks.length, 1)
  assert.deepEqual(scoped.dailyReports, [{ employeeId: "E5" }])
  assert.equal(scopeData(data, MD_USER).tasks.length, 2)
})

test("Other Responsible manages its own department", () => {
  const other = emp("E9", "Other Responsible", "Sales")
  assert.equal(isManagement(other), true)
  assert.equal(canAssignTo(other, sales), true)
  assert.equal(canAssignTo(other, design), false)
  assert.equal(canSeeTask(other, task("E2", "Design"), employees), false)
})
