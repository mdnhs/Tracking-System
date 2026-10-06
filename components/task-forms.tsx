"use client"

import {
  Alert02Icon,
  MessageAdd01Icon,
  PauseIcon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { FormSelect, type SelectOption } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  addTaskUpdate,
  holdTask,
  reassignTask,
  recordDelayReason,
} from "@/lib/actions"
import {
  delayReasonSchema,
  holdSchema,
  reassignSchema,
  taskUpdateSchema,
  type DelayReasonValues,
  type HoldValues,
  type ReassignValues,
  type TaskUpdateValues,
} from "@/lib/schemas"

type IconType = typeof PauseIcon

function SubmitButton({
  submitting,
  icon,
  label,
  pendingLabel,
}: {
  submitting: boolean
  icon: IconType
  label: string
  pendingLabel: string
}) {
  return (
    <Field orientation="horizontal">
      <Button type="submit" size="sm" variant="outline" disabled={submitting}>
        <HugeiconsIcon icon={icon} strokeWidth={2} data-icon="inline-start" />
        {submitting ? pendingLabel : label}
      </Button>
    </Field>
  )
}

export function HoldForm({ taskId }: { taskId: string }) {
  const form = useForm<HoldValues>({
    resolver: zodResolver(holdSchema),
    defaultValues: { reason: "" },
  })

  async function onSubmit(values: HoldValues) {
    const result = await holdTask(taskId, values)
    if (!result.ok) form.setError("root", { message: result.error })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="hold-reason">Put on hold</FieldLabel>
              <Input
                {...field}
                id="hold-reason"
                aria-invalid={fieldState.invalid}
                placeholder="Why is this work paused?"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitButton
          submitting={form.formState.isSubmitting}
          icon={PauseIcon}
          label="Put On Hold"
          pendingLabel="Pausing…"
        />
      </FieldGroup>
    </form>
  )
}

export function ReassignForm({
  taskId,
  assignees,
}: {
  taskId: string
  assignees: SelectOption[]
}) {
  const form = useForm<ReassignValues>({
    resolver: zodResolver(reassignSchema),
    defaultValues: { assignedTo: "" },
  })

  async function onSubmit(values: ReassignValues) {
    const result = await reassignTask(taskId, values)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset({ assignedTo: "" })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="assignedTo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reassign">
                Reassign / distribute to
              </FieldLabel>
              <FormSelect
                id="reassign"
                items={assignees}
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
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitButton
          submitting={form.formState.isSubmitting}
          icon={UserSwitchIcon}
          label="Reassign"
          pendingLabel="Reassigning…"
        />
      </FieldGroup>
    </form>
  )
}

export function DelayReasonForm({
  taskId,
  reasons,
  defaultValues,
}: {
  taskId: string
  reasons: string[]
  defaultValues: DelayReasonValues
}) {
  const form = useForm<DelayReasonValues>({
    resolver: zodResolver(delayReasonSchema),
    defaultValues,
  })
  const items = reasons.map((r) => ({ value: r, label: r }))

  async function onSubmit(values: DelayReasonValues) {
    const result = await recordDelayReason(taskId, values)
    if (!result.ok) form.setError("root", { message: result.error })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="delay-reason">Delay reason</FieldLabel>
              <FormSelect
                id="delay-reason"
                items={items}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Select a reason"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="explanation"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="delay-explanation">
                Explanation (optional)
              </FieldLabel>
              <Textarea
                {...field}
                id="delay-explanation"
                aria-invalid={fieldState.invalid}
                placeholder="Short explanation of the delay"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitButton
          submitting={form.formState.isSubmitting}
          icon={Alert02Icon}
          label="Save delay reason"
          pendingLabel="Saving…"
        />
      </FieldGroup>
    </form>
  )
}

export function UpdateForm({ taskId }: { taskId: string }) {
  const form = useForm<TaskUpdateValues>({
    resolver: zodResolver(taskUpdateSchema),
    defaultValues: { text: "" },
  })

  async function onSubmit(values: TaskUpdateValues) {
    const result = await addTaskUpdate(taskId, values)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset({ text: "" })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="text"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="update-text">Add an update</FieldLabel>
              <Textarea
                {...field}
                id="update-text"
                aria-invalid={fieldState.invalid}
                placeholder="Progress note or comment"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitButton
          submitting={form.formState.isSubmitting}
          icon={MessageAdd01Icon}
          label="Post update"
          pendingLabel="Posting…"
        />
      </FieldGroup>
    </form>
  )
}
