import assert from "node:assert/strict"
import { test } from "node:test"

import {
  emptyReport,
  findReport,
  reportsForDate,
  upsertReport,
} from "@/lib/reports"

test("reportsForDate returns one report per employee for that date", () => {
  const submitted = {
    ...emptyReport("E1", "2026-10-05"),
    morning: { ...emptyReport("E1", "x").morning, submitted: true },
  }
  const reports = [submitted, emptyReport("E2", "2026-10-04")]
  const out = reportsForDate(
    reports,
    [{ id: "E1" }, { id: "E2" }],
    "2026-10-05"
  )
  assert.equal(out.length, 2)
  assert.equal(out[0], submitted)
  assert.equal(out[1].date, "2026-10-05")
  assert.equal(out[1].morning.submitted, false)
})

test("upsertReport creates once per employee per day", () => {
  const reports = []
  const a = upsertReport(reports, "E1", "2026-10-06")
  const b = upsertReport(reports, "E1", "2026-10-06")
  upsertReport(reports, "E1", "2026-10-07")
  assert.equal(a, b)
  assert.equal(reports.length, 2)
  assert.equal(findReport(reports, "E1", "2026-10-07")?.date, "2026-10-07")
})
