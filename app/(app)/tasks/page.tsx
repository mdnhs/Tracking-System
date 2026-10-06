import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { StatusBadge } from "@/components/status-badge"
import { TaskCreateSheet } from "@/components/task-create-sheet"
import { TaskTable } from "@/components/task-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isManagement } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import type { TaskStatusKey } from "@/lib/types"
import { cn } from "@/lib/utils"

const filters: Array<{ key: TaskStatusKey | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In Progress" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "on-hold", label: "On Hold" },
  { key: "cancelled", label: "Cancelled" },
]

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = "all" } = await searchParams
  const { user, data, all } = await getSession()

  const tasks =
    status === "all"
      ? data.tasks
      : data.tasks.filter((t) => t.status === status)

  const countFor = (key: string) =>
    key === "all"
      ? data.tasks.length
      : data.tasks.filter((t) => t.status === key).length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppHeader description="Every piece of work captured in one clear, consistent record." />
        {isManagement(user) ? (
          <TaskCreateSheet employees={data.employees} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/tasks" : `/tasks?status=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              status === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
            <span className="ml-1.5 text-xs tabular-nums opacity-70">
              {countFor(f.key)}
            </span>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status at a glance</CardTitle>
          <CardDescription>
            Colour-coded statuses anyone can understand in a second
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.taskStatuses.map((status) => (
              <li key={status.key} className="flex flex-col gap-1.5">
                <StatusBadge status={status.key} className="self-start" />
                <span className="text-xs text-muted-foreground">
                  {status.description}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TaskTable
            tasks={tasks}
            employees={all.employees}
            statusFilter={false}
          />
        </CardContent>
      </Card>
    </>
  )
}
