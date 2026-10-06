"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Controller,
  useForm,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { submitEveningReport, submitMorningReport } from "@/lib/actions"
import {
  eveningReportSchema,
  morningReportSchema,
  type EveningReportValues,
  type MorningReportValues,
} from "@/lib/schemas"
import type { EveningReport, MorningReport } from "@/lib/types"

function join(items: string[] | undefined) {
  return (items ?? []).join("\n")
}

function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  multiline = true,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder: string
  multiline?: boolean
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          {multiline ? (
            <Textarea
              {...field}
              id={name}
              aria-invalid={fieldState.invalid}
              placeholder={placeholder}
            />
          ) : (
            <Input
              {...field}
              id={name}
              aria-invalid={fieldState.invalid}
              placeholder={placeholder}
            />
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

function SubmitRow({
  submitting,
  label,
}: {
  submitting: boolean
  label: string
}) {
  return (
    <Field orientation="horizontal">
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Submitting…" : label}
      </Button>
    </Field>
  )
}

function MorningForm({ morning }: { morning?: MorningReport }) {
  const form = useForm<MorningReportValues>({
    resolver: zodResolver(morningReportSchema),
    defaultValues: {
      priorities: join(morning?.priorities),
      plannedWork: join(morning?.plannedWork),
      importantTasks: join(morning?.importantTasks),
      blockers: join(morning?.blockers),
    },
  })

  async function onSubmit(values: MorningReportValues) {
    const result = await submitMorningReport(values)
    if (!result.ok) form.setError("root", { message: result.error })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <TextField
          control={form.control}
          name="priorities"
          label="Priorities"
          placeholder="One priority per line"
        />
        <TextField
          control={form.control}
          name="plannedWork"
          label="Planned work"
          placeholder="One item per line"
        />
        <TextField
          control={form.control}
          name="importantTasks"
          label="Important tasks"
          placeholder="One task per line"
        />
        <TextField
          control={form.control}
          name="blockers"
          label="Blockers"
          placeholder="One blocker per line"
        />
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitRow
          submitting={form.formState.isSubmitting}
          label={
            morning?.submitted
              ? "Update morning report"
              : "Submit morning report"
          }
        />
      </FieldGroup>
    </form>
  )
}

function EveningForm({ evening }: { evening?: EveningReport }) {
  const form = useForm<EveningReportValues>({
    resolver: zodResolver(eveningReportSchema),
    defaultValues: {
      completed: join(evening?.completed),
      ongoing: join(evening?.ongoing),
      pending: join(evening?.pending),
      problems: evening?.problems ?? "",
      incompleteReason: evening?.incompleteReason ?? "",
    },
  })

  async function onSubmit(values: EveningReportValues) {
    const result = await submitEveningReport(values)
    if (!result.ok) form.setError("root", { message: result.error })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <TextField
          control={form.control}
          name="completed"
          label="Completed work"
          placeholder="One item per line"
        />
        <TextField
          control={form.control}
          name="ongoing"
          label="Ongoing work"
          placeholder="One item per line"
        />
        <TextField
          control={form.control}
          name="pending"
          label="Pending work"
          placeholder="One item per line"
        />
        <TextField
          control={form.control}
          name="problems"
          label="Problems / blockers"
          placeholder="Any problems today"
          multiline={false}
        />
        <TextField
          control={form.control}
          name="incompleteReason"
          label="Reason for incomplete tasks"
          placeholder="Why work was not finished"
          multiline={false}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <SubmitRow
          submitting={form.formState.isSubmitting}
          label={
            evening?.submitted
              ? "Update evening report"
              : "Submit evening report"
          }
        />
      </FieldGroup>
    </form>
  )
}

export function ReportForms({
  morning,
  evening,
}: {
  morning?: MorningReport
  evening?: EveningReport
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Sun03Icon}
              className="size-4 text-amber-500"
              strokeWidth={2}
            />
            Submit Morning Report
          </CardTitle>
          <CardDescription>
            Today&apos;s plan — one item per line
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MorningForm morning={morning} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Moon02Icon}
              className="size-4 text-indigo-500"
              strokeWidth={2}
            />
            Submit End-of-Day Report
          </CardTitle>
          <CardDescription>
            Today&apos;s result — one item per line
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EveningForm evening={evening} />
        </CardContent>
      </Card>
    </div>
  )
}
