export interface GeneralSettings {
  companyName: string
  tagline: string
}

export interface WorkflowSettings {
  delayReasons: string[]
  attentionWindowDays: number
}

export interface AiProvider {
  id: string
  name: string
  endpoint: string
  apiKeyEncrypted: string | null
  apiKeyLast4: string | null
  models: string[]
  defaultModel: string | null
}

export interface AppSettings {
  general: GeneralSettings
  workflow: WorkflowSettings
  ai: { defaultProviderId: string | null; providers: AiProvider[] }
}

export type PublicAiProvider = Omit<
  AiProvider,
  "apiKeyEncrypted" | "apiKeyLast4"
> & { hasApiKey: boolean; apiKeyHint: string | null }

export interface PublicSettings {
  general: GeneralSettings
  workflow: WorkflowSettings
  ai: { defaultProviderId: string | null; providers: PublicAiProvider[] }
}

export const DEFAULT_ATTENTION_WINDOW_DAYS = 2

export const PROVIDER_PRESETS = [
  { id: "groq", label: "Groq", endpoint: "https://api.groq.com/openai/v1" },
  {
    id: "gemini",
    label: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
] as const

function legacyDelayReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const reasons: string[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const reason = item.trim()
    const key = reason.toLowerCase()
    if (!reason || seen.has(key)) continue
    seen.add(key)
    reasons.push(reason)
  }
  return reasons
}

// Stores written before settings existed keep company, tagline and delay reasons elsewhere.
export function upgradeLegacySettings(raw: Record<string, unknown>): void {
  if (raw.settings) return
  const meta = (raw.meta ?? {}) as Record<string, unknown>
  const reasons = legacyDelayReasons(raw.delayReasons)
  const settings: AppSettings = {
    general: {
      companyName: String(meta.company ?? "Company"),
      tagline: String(meta.tagline ?? ""),
    },
    workflow: {
      delayReasons: reasons.length > 0 ? reasons : ["Other"],
      attentionWindowDays: DEFAULT_ATTENTION_WINDOW_DAYS,
    },
    ai: { defaultProviderId: null, providers: [] },
  }
  delete meta.company
  delete meta.tagline
  delete raw.delayReasons
  raw.settings = settings
}

export function toPublicSettings(settings: AppSettings): PublicSettings {
  return {
    general: { ...settings.general },
    workflow: {
      ...settings.workflow,
      delayReasons: [...settings.workflow.delayReasons],
    },
    ai: {
      defaultProviderId: settings.ai.defaultProviderId,
      providers: settings.ai.providers.map(
        ({ apiKeyEncrypted, apiKeyLast4, ...rest }) => ({
          ...rest,
          models: [...rest.models],
          hasApiKey: apiKeyEncrypted !== null,
          apiKeyHint: apiKeyLast4 ? `••••${apiKeyLast4}` : null,
        })
      ),
    },
  }
}

export interface ProviderChange {
  id?: string
  name: string
  endpoint: string
  key: { action: "keep" } | { action: "set"; encrypted: string; last4: string }
  models: string[]
  defaultModel: string
}

export function applyProviderInput(
  settings: AppSettings,
  change: ProviderChange,
  newId: () => string
): { ok: true; id: string } | { ok: false; error: string } {
  const { providers } = settings.ai
  const existing = change.id
    ? providers.find((p) => p.id === change.id)
    : undefined
  if (change.id && !existing) return { ok: false, error: "Provider not found" }

  const clash = providers.some(
    (p) =>
      p.id !== change.id && p.name.toLowerCase() === change.name.toLowerCase()
  )
  if (clash) {
    return { ok: false, error: "A provider with this name already exists" }
  }

  if (
    existing?.apiKeyEncrypted &&
    existing.endpoint !== change.endpoint &&
    change.key.action === "keep"
  ) {
    return { ok: false, error: "Enter the API key to use a new endpoint" }
  }

  const provider: AiProvider = existing ?? {
    id: newId(),
    name: "",
    endpoint: "",
    apiKeyEncrypted: null,
    apiKeyLast4: null,
    models: [],
    defaultModel: null,
  }
  provider.name = change.name
  provider.endpoint = change.endpoint
  provider.models = [...change.models]
  provider.defaultModel = change.defaultModel
  if (change.key.action === "set") {
    provider.apiKeyEncrypted = change.key.encrypted
    provider.apiKeyLast4 = change.key.last4
  }

  if (!existing) providers.push(provider)
  // Only the very first provider becomes the default; later adds and edits never pick one silently.
  if (!existing && providers.length === 1) {
    settings.ai.defaultProviderId ??= provider.id
  }
  return { ok: true, id: provider.id }
}

export function pickKeySource(
  provider: Pick<AiProvider, "endpoint" | "apiKeyEncrypted"> | undefined,
  endpoint: string,
  typedKey: string
):
  | { ok: true; kind: "typed"; key: string }
  | { ok: true; kind: "stored"; encrypted: string }
  | { ok: false; error: string } {
  if (typedKey) return { ok: true, kind: "typed", key: typedKey }
  if (!provider?.apiKeyEncrypted) {
    return { ok: false, error: "Enter the API key to fetch models" }
  }
  // A saved key only travels to the endpoint it was saved with.
  if (provider.endpoint !== endpoint) {
    return { ok: false, error: "Enter the API key to use a new endpoint" }
  }
  return { ok: true, kind: "stored", encrypted: provider.apiKeyEncrypted }
}

export function removeProvider(settings: AppSettings, id: string): boolean {
  const before = settings.ai.providers.length
  settings.ai.providers = settings.ai.providers.filter((p) => p.id !== id)
  if (settings.ai.defaultProviderId === id) settings.ai.defaultProviderId = null
  return settings.ai.providers.length < before
}

export function setDefaultProvider(settings: AppSettings, id: string): boolean {
  if (!settings.ai.providers.some((p) => p.id === id)) return false
  settings.ai.defaultProviderId = id
  return true
}

export function clearProviderKey(settings: AppSettings, id: string): boolean {
  const provider = settings.ai.providers.find((p) => p.id === id)
  if (!provider) return false
  provider.apiKeyEncrypted = null
  provider.apiKeyLast4 = null
  return true
}
