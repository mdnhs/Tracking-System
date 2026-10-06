"use client"

import { AiMagicIcon, Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState, useTransition } from "react"
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { generateFieldText } from "@/lib/ai/actions"
import type { AiField as AiFieldKind, AiFieldContext } from "@/lib/ai/fields"

export function AiField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  aiField,
  context,
  multiline = true,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder: string
  aiField: AiFieldKind
  context?: AiFieldContext
  multiline?: boolean
}) {
  const [generating, startGenerate] = useTransition()
  const [aiDraft, setAiDraft] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const showDraft = aiDraft && String(field.value).trim() !== ""
        const hasUserText =
          String(field.value).trim() !== "" && !aiDraft

        function run() {
          setConfirmReplace(false)
          setError(null)
          startGenerate(async () => {
            try {
              const result = await generateFieldText({ field: aiField, context })
              if (!result.ok) {
                setError(result.error ?? "AI generation failed. Try again.")
                return
              }
              field.onChange(result.text ?? "")
              setAiDraft(true)
            } catch {
              setError("AI generation failed. Try again.")
            }
          })
        }

        function generate() {
          // Never silently replace text the user typed.
          if (hasUserText && !confirmReplace) {
            setConfirmReplace(true)
            return
          }
          run()
        }

        function edit(
          event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) {
          field.onChange(event)
          setAiDraft(false)
          setConfirmReplace(false)
          setError(null)
        }

        return (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={name}>{label}</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={generating}
                onClick={generate}
              >
                <HugeiconsIcon
                  icon={AiMagicIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                {generating
                  ? "Generating…"
                  : confirmReplace
                    ? "Replace with AI?"
                    : "Generate with AI"}
              </Button>
            </div>
            {multiline ? (
              <Textarea
                {...field}
                id={name}
                disabled={generating}
                aria-invalid={fieldState.invalid}
                placeholder={placeholder}
                onChange={edit}
              />
            ) : (
              <Input
                {...field}
                id={name}
                disabled={generating}
                aria-invalid={fieldState.invalid}
                placeholder={placeholder}
                onChange={edit}
              />
            )}
            {showDraft ? (
              <p
                role="status"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={AiMagicIcon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                AI-generated draft — review and edit before saving.
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-sm text-destructive"
              >
                <HugeiconsIcon
                  icon={Alert02Icon}
                  className="mt-0.5 size-3.5 shrink-0"
                  strokeWidth={2}
                />
                {error}
              </p>
            ) : null}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )
      }}
    />
  )
}
