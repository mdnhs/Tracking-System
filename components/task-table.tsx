"use client"

import { Attachment01Icon, Comment01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import * as React from "react"

import {
  DataTable,
  dataTableColumns,
  type DataTableColumn,
} from "@/components/data-table"
import { PriorityBadge, StatusBadge } from "@/components/status-badge"
import { Avatar } from "@/components/user-avatar"
import { formatDate } from "@/lib/format"
import type { Employee, Task } from "@/lib/types"

export type TaskColumnId =
  | "title"
  | "assignedTo"
  | "department"
  | "priority"
  | "deadline"
  | "delayReason"
  | "status"

const DEFAULT_COLUMNS: TaskColumnId[] = [
  "title",
  "assignedTo",
  "department",
  "priority",
  "deadline",
  "status",
]

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Overdue", value: "overdue" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on-hold" },
  { label: "Cancelled", value: "cancelled" },
]

const column = dataTableColumns<Task>()

export function TaskTable({
  tasks,
  employees,
  columns = DEFAULT_COLUMNS,
  statusFilter = true,
  emptyMessage = "No tasks match your filters.",
}: {
  tasks: Task[]
  employees: Employee[]
  columns?: TaskColumnId[]
  statusFilter?: boolean
  emptyMessage?: string
}) {
  const definitions = React.useMemo(() => {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const all: Record<TaskColumnId, DataTableColumn<Task>> = {
      title: column.accessor("title", {
        header: "Task",
        cell: ({ row }) => (
          <Link
            href={`/tasks/${row.original.id}`}
            className="flex flex-col whitespace-normal hover:underline"
          >
            <span className="font-medium">{row.original.title}</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {row.original.id} · {row.original.project}
              </span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Comment01Icon} className="size-3" />
                {row.original.comments}
              </span>
              {row.original.attachments.length > 0 ? (
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={Attachment01Icon} className="size-3" />
                  {row.original.attachments.length}
                </span>
              ) : null}
            </span>
          </Link>
        ),
      }),
      assignedTo: column.accessor("assignedTo", {
        header: "Assignee",
        cell: ({ row }) => {
          const employee = employeeById.get(row.original.assignedTo)
          return (
            <div className="flex items-center gap-2">
              <Avatar
                name={employee?.name ?? row.original.assignedTo}
                seed={row.original.assignedTo}
                className="size-6"
              />
              <span>{employee?.name ?? row.original.assignedTo}</span>
            </div>
          )
        },
      }),
      department: column.accessor("department", {
        header: "Department",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.department}
          </span>
        ),
      }),
      priority: column.accessor("priority", {
        header: "Priority",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      }),
      deadline: column.accessor("deadline", {
        header: "Deadline",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.deadline)}
          </span>
        ),
      }),
      delayReason: column.accessor("delayReason", {
        header: "Delay reason",
        cell: ({ row }) => (
          <span className="whitespace-normal text-muted-foreground">
            {row.original.delayReason ?? "Not recorded"}
          </span>
        ),
      }),
      status: column.accessor("status", {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      }),
    }
    return columns.map((id) => all[id])
  }, [employees, columns])

  return (
    <DataTable
      data={tasks}
      columns={definitions}
      getRowId={(task) => task.id}
      search={{ columnId: "title", placeholder: "Search tasks…" }}
      filter={
        statusFilter
          ? {
              columnId: "status",
              placeholder: "All statuses",
              options: STATUS_OPTIONS,
            }
          : undefined
      }
      emptyMessage={emptyMessage}
      countLabel="task(s)"
    />
  )
}
