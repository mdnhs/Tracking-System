"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { AiField } from "@/components/ai-field"
import { DatePicker } from "@/components/date-picker"
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
  SheetTrigger,
} from "@/components/ui/sheet"
import { createTask } from "@/lib/actions"
import { todayISO } from "@/lib/format"
import { createTaskSchema, type CreateTaskValues } from "@/lib/schemas"
import type { Employee } from "@/lib/types"

const PRIORITY_ITEMS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

function emptyTask(): CreateTaskValues {
  return {
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    department: "",
    project: "",
    startDate: todayISO(),
    deadline: "",
  }
}

export function TaskCreateSheet({ employees }: { employees: Employee[] }) {
  const assigneeItems = employees.map((e) => ({
    value: e.id,
    label: `${e.name} · ${e.role}`,
  }))
  const departmentItems = [...new Set(employees.map((e) => e.department))]
    .sort()
    .map((d) => ({ value: d, label: d }))
  const [open, setOpen] = useState(false)

  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: emptyTask(),
  })
  const title = useWatch({ control: form.control, name: "title" })
  const project = useWatch({ control: form.control, name: "project" })
  const department = useWatch({ control: form.control, name: "department" })

  async function onSubmit(values: CreateTaskValues) {
    const result = await createTask(values)
    if (!result.ok) {
      form.setError("root", {
        message: result.error ?? "Unable to create the task.",
      })
      return
    }
    form.reset(emptyTask())
    setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value) form.reset(emptyTask())
      }}
    >
      <SheetTrigger
        render={
          <Button size="sm">
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            New Task
          </Button>
        }
      />
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Create &amp; Assign Task</SheetTitle>
          <SheetDescription>
            Capture the work and assign it to a responsible person.
          </SheetDescription>
        </SheetHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="px-4 pb-4"
        >
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="title">Task title</FieldLabel>
                  <Input
                    {...field}
                    id="title"
                    aria-invalid={fieldState.invalid}
                    placeholder="Short name of the work"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <AiField
              control={form.control}
              name="description"
              label="Description"
              placeholder="Detail of the work"
              aiField="task-description"
              context={{ title, project, department }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="assignedTo"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="assignedTo">
                      Assigned person
                    </FieldLabel>
                    <FormSelect
                      id="assignedTo"
                      items={assigneeItems}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Select a person"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="priority"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="priority">Priority</FieldLabel>
                    <FormSelect
                      id="priority"
                      items={PRIORITY_ITEMS}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="department"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="department">
                      Department / team
                    </FieldLabel>
                    <FormSelect
                      id="department"
                      items={departmentItems}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Same as assignee"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="project"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="project">Project / client</FieldLabel>
                    <Input
                      {...field}
                      id="project"
                      aria-invalid={fieldState.invalid}
                      placeholder="Related project"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="startDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="startDate">Start date</FieldLabel>
                    <DatePicker
                      id="startDate"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="deadline"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="deadline">Deadline</FieldLabel>
                    <DatePicker
                      id="deadline"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Pick a deadline"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>

          <SheetFooter className="mt-6 px-0">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create Task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
