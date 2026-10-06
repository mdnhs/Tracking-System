import { promises as fs } from "fs"
import { connection } from "next/server"
import path from "path"

import { todayISO } from "@/lib/format"
import { upgradeLegacySettings } from "@/lib/settings-model"
import { syncOverdue } from "@/lib/tasks"
import type { DailyReport, TrackingData } from "@/lib/types"

interface LegacyDailyReports {
  date: string
  reports: Omit<DailyReport, "date">[]
}

const SEED_FILE = path.join(process.cwd(), "public", "data.json")
const STORE_FILE = path.join(process.cwd(), ".data", "data.json")

let state: TrackingData | null = null

async function readJson(file: string): Promise<TrackingData> {
  return JSON.parse(await fs.readFile(file, "utf8")) as TrackingData
}

async function load(): Promise<TrackingData> {
  if (!state) {
    try {
      state = await readJson(STORE_FILE)
    } catch {
      state = await readJson(SEED_FILE)
    }
    // Stores written before completedAt, dated reports, attachment files and settings need upgrading.
    upgradeLegacySettings(state as unknown as Record<string, unknown>)
    for (const task of state.tasks) {
      task.completedAt ??= null
      task.holdReason ??= null
      task.acceptedAt ??= task.status === "pending" ? null : task.startDate
      if (!Array.isArray(task.attachments)) task.attachments = []
    }
    const reports = state.dailyReports as unknown as
      DailyReport[] | LegacyDailyReports
    if (!Array.isArray(reports)) {
      state.dailyReports = reports.reports.map((r) => ({
        ...r,
        date: reports.date,
      }))
    }
  }
  syncOverdue(state.tasks, todayISO())
  return state
}

export async function getData(): Promise<TrackingData> {
  // Overdue status depends on today's date, so never prerender at build time.
  await connection()
  return structuredClone(await load())
}

export async function mutate<T>(fn: (data: TrackingData) => T): Promise<T> {
  const data = await load()
  const result = fn(data)
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8")
  return result
}
