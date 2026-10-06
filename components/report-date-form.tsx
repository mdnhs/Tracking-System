"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { reportDateSchema, type ReportDateValues } from "@/lib/schemas"

export function ReportDateForm({ date, max }: { date: string; max: string }) {
  const router = useRouter()
  const form = useForm<ReportDateValues>({
    resolver: zodResolver(reportDateSchema),
    values: { date },
  })

  return (
    <form
      noValidate
      className="flex items-center gap-2"
      onSubmit={form.handleSubmit(({ date: next }) =>
        router.push(`/reports?date=${next}`)
      )}
    >
      <Controller
        name="date"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="w-auto">
            <FieldLabel htmlFor="report-date" className="sr-only">
              Report date
            </FieldLabel>
            <DatePicker
              id="report-date"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              max={max}
              aria-invalid={fieldState.invalid}
              className="h-8"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Button type="submit" variant="outline" size="sm">
        Go
      </Button>
    </form>
  )
}
