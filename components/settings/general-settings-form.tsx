"use client"

import { zodResolver } from "@hookform/resolvers/zod"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  generalSettingsSchema,
  type GeneralSettingsValues,
} from "@/lib/schemas"
import { saveGeneralSettings } from "@/lib/settings-actions"

export function GeneralSettingsForm({
  defaultValues,
}: {
  defaultValues: GeneralSettingsValues
}) {
  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues,
  })
  const { isSubmitting, isSubmitSuccessful, isDirty } = form.formState

  async function onSubmit(values: GeneralSettingsValues) {
    const result = await saveGeneralSettings(values)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Company details shown across the app</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="companyName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="companyName">Company name</FieldLabel>
                  <Input
                    {...field}
                    id="companyName"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="tagline"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
                  <Input
                    {...field}
                    id="tagline"
                    aria-invalid={fieldState.invalid}
                  />
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
