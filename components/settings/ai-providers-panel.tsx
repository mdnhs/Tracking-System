"use client"

import { Add01Icon, Alert02Icon, Key01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState, useTransition } from "react"

import { ProviderSheet } from "@/components/settings/provider-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  deleteProvider,
  makeDefaultProvider,
  removeProviderKey,
  type SettingsResult,
} from "@/lib/settings-actions"
import type { PublicAiProvider, PublicSettings } from "@/lib/settings-model"

function ProviderCard({
  provider,
  isDefault,
  onEdit,
}: {
  provider: PublicAiProvider
  isDefault: boolean
  onEdit: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemoveKey, setConfirmRemoveKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<SettingsResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) setError(result.error ?? "Something went wrong")
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {provider.name}
          {isDefault ? <Badge variant="success">Default</Badge> : null}
        </CardTitle>
        <CardDescription className="font-mono text-xs break-all">
          {provider.endpoint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4" />
          {provider.apiKeyHint ?? "No key"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {provider.models.map((model) => (
            <Badge key={model} variant="outline" className="font-mono">
              {model}
              {model === provider.defaultModel ? " (default)" : ""}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {isDefault ? null : (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => makeDefaultProvider(provider.id))}
            >
              Set as default
            </Button>
          )}
          {provider.hasApiKey ? (
            confirmRemoveKey ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => removeProviderKey(provider.id))}
              >
                Confirm remove key
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRemoveKey(true)}
              >
                Remove key
              </Button>
            )
          ) : null}
          {confirmDelete ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteProvider(provider.id))}
            >
              Confirm delete
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function AiProvidersPanel({
  settings,
  secretConfigured,
}: {
  settings: PublicSettings["ai"]
  secretConfigured: boolean
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PublicAiProvider | null>(null)
  // A fresh key per opening remounts the sheet, so its form starts from this provider.
  const [sheetKey, setSheetKey] = useState(0)

  function openSheet(provider: PublicAiProvider | null) {
    setEditing(provider)
    setSheetKey((k) => k + 1)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      {secretConfigured ? null : (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            API keys cannot be saved until SETTINGS_SECRET is set. Add{" "}
            <code className="font-mono">
              SETTINGS_SECRET=&lt;random 32+ characters&gt;
            </code>{" "}
            to <code className="font-mono">.env.local</code> (generate one with{" "}
            <code className="font-mono">openssl rand -base64 32</code>) and
            restart the server.
          </span>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI providers</CardTitle>
          <CardDescription>
            Providers used to generate text with AI
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => openSheet(null)}>
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Add provider
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {settings.providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI providers yet.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {settings.providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isDefault={provider.id === settings.defaultProviderId}
                  onEdit={() => openSheet(provider)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProviderSheet
        key={sheetKey}
        provider={editing}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
