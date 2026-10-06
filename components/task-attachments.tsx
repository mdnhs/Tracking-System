"use client"

import {
  Attachment01Icon,
  Delete02Icon,
  Download04Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { deleteAttachment, uploadAttachments } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"
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
import { uploadSchema, type UploadValues } from "@/lib/schemas"
import type { Attachment } from "@/lib/types"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UploadForm({ taskId }: { taskId: string }) {
  // File inputs cannot be cleared through React state, so remount after upload.
  const [inputKey, setInputKey] = useState(0)
  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { files: [] },
  })

  async function onSubmit(values: UploadValues) {
    const formData = new FormData()
    formData.set("id", taskId)
    for (const file of values.files) formData.append("files", file)
    const result = await uploadAttachments(formData)
    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }
    form.reset({ files: [] })
    setInputKey((k) => k + 1)
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="files"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="attachment-files">Add files</FieldLabel>
              <Input
                key={inputKey}
                id="attachment-files"
                type="file"
                multiple
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(e) =>
                  field.onChange(Array.from(e.target.files ?? []))
                }
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Field orientation="horizontal">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={form.formState.isSubmitting}
          >
            <HugeiconsIcon
              icon={Upload04Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {form.formState.isSubmitting ? "Uploading…" : "Upload"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export function TaskAttachments({
  taskId,
  attachments,
  userName,
  canEdit,
  canManage,
}: {
  taskId: string
  attachments: Attachment[]
  userName: string
  canEdit: boolean
  canManage: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Attachment01Icon}
            className="size-4 text-muted-foreground"
            strokeWidth={2}
          />
          Attachments
        </CardTitle>
        <CardDescription>Supporting files, up to 10 MB each</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files attached.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)} · {file.uploadedBy}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  nativeButton={false}
                  render={
                    <a
                      href={`/tasks/${taskId}/attachments/${file.id}`}
                      download={file.name}
                    />
                  }
                  aria-label={`Download ${file.name}`}
                >
                  <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                </Button>
                {canManage || (canEdit && file.uploadedBy === userName) ? (
                  <form action={deleteAttachment}>
                    <input type="hidden" name="id" value={taskId} />
                    <input type="hidden" name="fileId" value={file.id} />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      pendingLabel="…"
                      aria-label={`Remove ${file.name}`}
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="border-t pt-4">
            <UploadForm taskId={taskId} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
