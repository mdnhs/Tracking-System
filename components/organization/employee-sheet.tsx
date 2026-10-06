"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { FormSelect } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { saveEmployee } from "@/lib/organization-actions"
import { employeeSchema, type EmployeeValues } from "@/lib/schemas"
import type { Employee } from "@/lib/types"

function valuesFor(employee: Employee | null): EmployeeValues {
  return {
    name: employee?.name ?? "",
    role: employee?.role ?? "",
    department: employee?.department ?? "",
  }
}

export function EmployeeSheet({
  employee,
  roles,
  departments,
  open,
  onOpenChange,
}: {
  employee: Employee | null
  roles: string[]
  departments: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: valuesFor(employee),
  })

  async function onSubmit(values: EmployeeValues) {
    const result = await saveEmployee({ ...values, id: employee?.id })
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{employee ? "Edit person" : "Add person"}</SheetTitle>
          <SheetDescription>
            Name, role and department. The role sets what the person can see.
          </SheetDescription>
        </SheetHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="px-4 pb-4"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="employee-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="employee-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Full name"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="employee-role">Role</FieldLabel>
                  <FormSelect
                    id="employee-role"
                    items={roles.map((role) => ({ value: role, label: role }))}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Select a role"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="department"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="employee-department">
                    Department
                  </FieldLabel>
                  <Input
                    {...field}
                    id="employee-department"
                    list="department-options"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Design"
                  />
                  <datalist id="department-options">
                    {departments.map((department) => (
                      <option key={department} value={department} />
                    ))}
                  </datalist>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>

          <SheetFooter className="mt-6 px-0">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save person"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
