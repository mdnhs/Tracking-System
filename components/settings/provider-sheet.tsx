"use client"

import { Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { FormSelect } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
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
import { providerSchema, type ProviderValues } from "@/lib/schemas"
import { fetchProviderModels, saveProvider } from "@/lib/settings-actions"
import { PROVIDER_PRESETS, type PublicAiProvider } from "@/lib/settings-model"

const PRESET_ITEMS = [
  ...PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label })),
  { value: "custom", label: "Custom" },
]

function valuesFor(provider: PublicAiProvider | null): ProviderValues {
  return {
    name: provider?.name ?? "",
    endpoint: provider?.endpoint ?? "",
    apiKey: "",
    models: provider?.models ?? [],
    defaultModel: provider?.defaultModel ?? "",
  }
}

export function ProviderSheet({
  provider,
  open,
  onOpenChange,
}: {
  provider: PublicAiProvider | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [preset, setPreset] = useState<string>(
    () =>
      PROVIDER_PRESETS.find((p) => p.endpoint === provider?.endpoint)?.id ??
      "custom"
  )
  const [available, setAvailable] = useState<string[]>(
    () => provider?.models ?? []
  )
  const [manualModel, setManualModel] = useState("")
  const [fetching, startFetch] = useTransition()
  const form = useForm<ProviderValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: valuesFor(provider),
  })
  const models = useWatch({ control: form.control, name: "models" })
  const listed = [...new Set([...available, ...models])].sort()

  function choosePreset(value: string) {
    setPreset(value)
    const match = PROVIDER_PRESETS.find((p) => p.id === value)
    if (!match) return
    form.setValue("endpoint", match.endpoint, { shouldValidate: true })
    if (!form.getValues("name")) {
      form.setValue("name", match.label, { shouldValidate: true })
    }
  }

  function setModels(next: string[]) {
    form.setValue("models", next, { shouldValidate: true, shouldDirty: true })
    if (!next.includes(form.getValues("defaultModel"))) {
      form.setValue("defaultModel", "")
    }
  }

  function fetchModels() {
    form.clearErrors("models")
    startFetch(async () => {
      const result = await fetchProviderModels({
        providerId: provider?.id,
        endpoint: form.getValues("endpoint"),
        apiKey: form.getValues("apiKey"),
      })
      if (!result.ok) {
        form.setError("models", { message: result.error })
        return
      }
      setAvailable(result.models ?? [])
    })
  }

  function addManualModel() {
    const id = manualModel.trim()
    if (!id) return
    setAvailable((list) => [...new Set([...list, id])])
    if (!models.includes(id)) setModels([...models, id])
    setManualModel("")
  }

  async function onSubmit(values: ProviderValues) {
    const result = await saveProvider({ ...values, id: provider?.id })
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
          <SheetTitle>
            {provider ? "Edit AI provider" : "Add AI provider"}
          </SheetTitle>
          <SheetDescription>
            OpenAI-compatible endpoint, for example Groq or Gemini.
          </SheetDescription>
        </SheetHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="px-4 pb-4"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider-preset">Preset</FieldLabel>
              <FormSelect
                id="provider-preset"
                items={PRESET_ITEMS}
                value={preset}
                onChange={choosePreset}
              />
            </Field>

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="provider-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="provider-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Groq"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="endpoint"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="provider-endpoint">
                    API Endpoint
                  </FieldLabel>
                  <Input
                    {...field}
                    id="provider-endpoint"
                    aria-invalid={fieldState.invalid}
                    placeholder="https://api.groq.com/openai/v1"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="provider-key">API Key</FieldLabel>
                  <Input
                    {...field}
                    id="provider-key"
                    type="password"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder={provider?.apiKeyHint ?? "Paste the API key"}
                  />
                  {provider?.hasApiKey ? (
                    <FieldDescription>
                      Leave blank to keep the stored key.
                    </FieldDescription>
                  ) : null}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="models"
              control={form.control}
              render={({ fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>AI Model List</FieldLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fetching}
                      onClick={fetchModels}
                    >
                      <HugeiconsIcon
                        icon={Refresh01Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                      {fetching ? "Fetching…" : "Fetch models"}
                    </Button>
                  </div>
                  {listed.length === 0 ? (
                    <FieldDescription>
                      Fetch the provider&apos;s models or add one by name.
                    </FieldDescription>
                  ) : (
                    <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border">
                      {listed.map((model) => {
                        const id = `model-${model}`
                        return (
                          <li
                            key={model}
                            className="flex items-center gap-2 px-3 py-2"
                          >
                            <Checkbox
                              id={id}
                              checked={models.includes(model)}
                              onCheckedChange={(checked) =>
                                setModels(
                                  checked
                                    ? [...models, model]
                                    : models.filter((m) => m !== model)
                                )
                              }
                            />
                            <label
                              htmlFor={id}
                              className="min-w-0 flex-1 truncate font-mono text-xs"
                            >
                              {model}
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={manualModel}
                      placeholder="Add a model id by hand"
                      aria-label="Model id"
                      onChange={(e) => setManualModel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addManualModel()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addManualModel}
                    >
                      Add
                    </Button>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="defaultModel"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="provider-default-model">
                    Default model
                  </FieldLabel>
                  <FormSelect
                    id="provider-default-model"
                    items={models.map((m) => ({ value: m, label: m }))}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Select a model"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>

          <SheetFooter className="mt-6 px-0">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save provider"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
