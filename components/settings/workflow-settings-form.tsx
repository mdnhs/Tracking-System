"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  workflowSettingsSchema,
  type WorkflowSettingsValues,
} from "@/lib/schemas"
import { saveWorkflowSettings } from "@/lib/settings-actions"

export function WorkflowSettingsForm({
  defaultValues,
}: {
  defaultValues: WorkflowSettingsValues
}) {
  const [draft, setDraft] = useState("")
  const form = useForm<WorkflowSettingsValues>({
    resolver: zodResolver(workflowSettingsSchema),
    defaultValues,
  })
  const { isSubmitting, isSubmitSuccessful, isDirty } = form.formState
  const itemErrors = form.formState.errors.delayReasons

  async function onSubmit(values: WorkflowSettingsValues) {
    const result = await saveWorkflowSettings(values)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow</CardTitle>
        <CardDescription>
          Delay reasons and the Needs Attention window
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="delayReasons"
              control={form.control}
              render={({ field, fieldState }) => {
                function addDraft() {
                  const reason = draft.trim()
                  if (!reason) return
                  field.onChange([...field.value, reason])
                  setDraft("")
                }
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="new-delay-reason">
                      Delay reasons
                    </FieldLabel>
                    <ul className="divide-y rounded-lg border">
                      {field.value.map((reason, i) => (
                        <li
                          key={`${reason}-${i}`}
                          className="flex items-center gap-2 py-1 pr-1 pl-3"
                        >
                          <span className="flex-1 text-sm">{reason}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Remove ${reason}`}
                            onClick={() =>
                              field.onChange(
                                field.value.filter((_, j) => j !== i)
                              )
                            }
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              strokeWidth={2}
                            />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <Input
                        id="new-delay-reason"
                        value={draft}
                        placeholder="Add a delay reason"
                        aria-invalid={fieldState.invalid}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addDraft()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addDraft}
                      >
                        Add
                      </Button>
                    </div>
                    <FieldDescription>
                      Removing a reason does not change tasks that already
                      recorded it.
                    </FieldDescription>
                    <FieldError
                      errors={
                        Array.isArray(itemErrors)
                          ? itemErrors
                          : [fieldState.error]
                      }
                    />
                  </Field>
                )
              }}
            />

            <Controller
              name="attentionWindowDays"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="attentionWindowDays">
                    Needs Attention window (days)
                  </FieldLabel>
                  <Input
                    id="attentionWindowDays"
                    type="number"
                    min={1}
                    max={14}
                    step={1}
                    className="max-w-24"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Open tasks due within this many days appear in Needs
                    Attention.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root]} />
            <Field orientation="horizontal">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
              {isSubmitSuccessful && !isDirty ? (
                <p className="text-sm text-muted-foreground">Saved.</p>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
