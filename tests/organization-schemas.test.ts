import assert from "node:assert/strict"
import { test } from "node:test"

import { employeeSchema } from "@/lib/schemas"

const ok = { name: "Niamh Kelly", role: "Manager", department: "Sales" }

test("employeeSchema requires a name, role and department", () => {
  assert.equal(employeeSchema.safeParse(ok).success, true)
  assert.equal(employeeSchema.safeParse({ ...ok, name: " " }).success, false)
  assert.equal(employeeSchema.safeParse({ ...ok, role: "" }).success, false)
  assert.equal(employeeSchema.safeParse({ ...ok, department: "" }).success, false)
})

test("employeeSchema caps lengths", () => {
  assert.equal(
    employeeSchema.safeParse({ ...ok, name: "x".repeat(81) }).success,
    false
  )
  assert.equal(
    employeeSchema.safeParse({ ...ok, department: "x".repeat(61) }).success,
    false
  )
})
