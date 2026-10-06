"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { AiField } from "@/components/ai-field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { submitEveningReport, submitMorningReport } from "@/lib/actions"
import type { AiFieldContext } from "@/lib/ai/fields"
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

function MorningForm({
  morning,
  context,
}: {
  morning?: MorningReport
  context?: AiFieldContext
}) {
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
        <AiField
          control={form.control}
          name="priorities"
          label="Priorities"
          placeholder="One priority per line"
          aiField="morning-priorities"
          context={context}
        />
        <AiField
          control={form.control}
          name="plannedWork"
          label="Planned work"
          placeholder="One item per line"
          aiField="morning-planned-work"
          context={context}
        />
        <AiField
          control={form.control}
          name="importantTasks"
          label="Important tasks"
          placeholder="One task per line"
          aiField="morning-important-tasks"
          context={context}
        />
        <AiField
          control={form.control}
          name="blockers"
          label="Blockers"
          placeholder="One blocker per line"
          aiField="morning-blockers"
          context={context}
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

function EveningForm({
  evening,
  context,
}: {
  evening?: EveningReport
  context?: AiFieldContext
}) {
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
        <AiField
          control={form.control}
          name="completed"
          label="Completed work"
          placeholder="One item per line"
          aiField="evening-completed"
          context={context}
        />
        <AiField
          control={form.control}
          name="ongoing"
          label="Ongoing work"
          placeholder="One item per line"
          aiField="evening-ongoing"
          context={context}
        />
        <AiField
          control={form.control}
          name="pending"
          label="Pending work"
          placeholder="One item per line"
          aiField="evening-pending"
          context={context}
        />
        <AiField
          control={form.control}
          name="problems"
          label="Problems / blockers"
          placeholder="Any problems today"
          aiField="evening-problems"
          context={context}
          multiline={false}
        />
        <AiField
          control={form.control}
          name="incompleteReason"
          label="Reason for incomplete tasks"
          placeholder="Why work was not finished"
          aiField="evening-incomplete-reason"
          context={context}
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
  context,
}: {
  morning?: MorningReport
  evening?: EveningReport
  context?: AiFieldContext
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
          <MorningForm morning={morning} context={context} />
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
          <EveningForm evening={evening} context={context} />
        </CardContent>
      </Card>
    </div>
  )
}
