"use client"

import { DataTable, dataTableColumns } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import type { DepartmentActivity, EmployeeActivity } from "@/lib/overview"

function NumberHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-right">{children}</div>
}

function NumberCell({ value }: { value: number }) {
  return <div className="text-right tabular-nums">{value}</div>
}

const employeeColumn = dataTableColumns<EmployeeActivity>()

const employeeColumns = [
  employeeColumn.accessor("name", {
    header: "Employee",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.department}
        </p>
      </div>
    ),
  }),
  employeeColumn.accessor("assigned", {
    header: () => <NumberHeader>Assigned</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.assigned} />,
  }),
  employeeColumn.accessor("completed", {
    header: () => <NumberHeader>Completed</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.completed} />,
  }),
  employeeColumn.accessor("openNow", {
    header: () => <NumberHeader>Open now</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.openNow} />,
  }),
  employeeColumn.accessor("overdueNow", {
    header: () => <NumberHeader>Overdue now</NumberHeader>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.overdueNow > 0 ? (
          <Badge variant="danger">{row.original.overdueNow}</Badge>
        ) : (
          0
        )}
      </div>
    ),
  }),
  employeeColumn.display({
    id: "reports",
    header: () => <NumberHeader>Reports (AM / PM)</NumberHeader>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.morningReports} / {row.original.eveningReports}
      </div>
    ),
  }),
]

export function EmployeeActivityTable({ rows }: { rows: EmployeeActivity[] }) {
  return (
    <DataTable
      data={rows}
      columns={employeeColumns}
      getRowId={(row) => row.id}
      search={{ columnId: "name", placeholder: "Search employees…" }}
      emptyMessage="No employees in scope."
      countLabel="employee(s)"
    />
  )
}

const departmentColumn = dataTableColumns<DepartmentActivity>()

const departmentColumns = [
  departmentColumn.accessor("department", {
    header: "Department",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.department}</span>
    ),
  }),
  departmentColumn.accessor("assigned", {
    header: () => <NumberHeader>Assigned</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.assigned} />,
  }),
  departmentColumn.accessor("completed", {
    header: () => <NumberHeader>Completed</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.completed} />,
  }),
  departmentColumn.accessor("overdueNow", {
    header: () => <NumberHeader>Overdue now</NumberHeader>,
    cell: ({ row }) => <NumberCell value={row.original.overdueNow} />,
  }),
]

export function DepartmentActivityTable({
  rows,
}: {
  rows: DepartmentActivity[]
}) {
  return (
    <DataTable
      data={rows}
      columns={departmentColumns}
      getRowId={(row) => row.department}
      emptyMessage="No department activity."
      countLabel="department(s)"
    />
  )
}
