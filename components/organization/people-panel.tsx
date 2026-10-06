"use client"

import { Add01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState, useTransition } from "react"

import { EmployeeSheet } from "@/components/organization/employee-sheet"
import { Avatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteEmployee } from "@/lib/organization-actions"
import type { Employee } from "@/lib/types"

function PersonRow({
  employee,
  onEdit,
}: {
  employee: Employee
  onEdit: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteEmployee(employee.id)
      if (!result.ok) setError(result.error ?? "Something went wrong")
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar name={employee.name} seed={employee.id} className="size-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{employee.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {employee.id}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{employee.role}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {employee.department}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <HugeiconsIcon
              icon={PencilEdit01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Edit
          </Button>
          {confirm ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={remove}
            >
              Confirm delete
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              Delete
            </Button>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

export function PeoplePanel({
  employees,
  roles,
  departments,
}: {
  employees: Employee[]
  roles: string[]
  departments: string[]
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  // A fresh key per opening remounts the sheet, so its form starts from this person.
  const [sheetKey, setSheetKey] = useState(0)

  function openSheet(employee: Employee | null) {
    setEditing(employee)
    setSheetKey((key) => key + 1)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-5 pb-4">
          <CardTitle>People</CardTitle>
          <CardDescription>
            {employees.length} in the organization
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => openSheet(null)}>
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Add person
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pb-5">
          {employees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No people yet. Add the first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <PersonRow
                    key={employee.id}
                    employee={employee}
                    onEdit={() => openSheet(employee)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmployeeSheet
        key={sheetKey}
        employee={editing}
        roles={roles}
        departments={departments}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
