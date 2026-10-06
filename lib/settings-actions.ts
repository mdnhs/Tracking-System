"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { AiError, listModels } from "@/lib/ai/client"
import { checkEndpoint } from "@/lib/ai/endpoint"
import { decryptSecret, encryptSecret, SecretError } from "@/lib/crypto"
import {
  fetchModelsSchema,
  generalSettingsSchema,
  providerSchema,
  workflowSettingsSchema,
  type FetchModelsValues,
  type GeneralSettingsValues,
  type ProviderValues,
  type WorkflowSettingsValues,
} from "@/lib/schemas"
import { getSession } from "@/lib/session"
import { getSettings, updateSettings } from "@/lib/settings"
import {
  applyProviderInput,
  clearProviderKey,
  pickKeySource,
  removeProvider,
  setDefaultProvider,
  type ProviderChange,
} from "@/lib/settings-model"

export interface SettingsResult {
  ok: boolean
  error?: string
  id?: string
  models?: string[]
}

const NOT_ALLOWED: SettingsResult = {
  ok: false,
  error: "Only the Managing Director can change settings.",
}

async function isMD(): Promise<boolean> {
  return (await getSession()).user.role === "MD"
}

function parse<T>(
  schema: z.ZodType<T>,
  values: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(values)
  return result.success
    ? { data: result.data }
    : { error: result.error.issues[0]?.message ?? "Invalid input" }
}

function done(): SettingsResult {
  revalidatePath("/", "layout")
  return { ok: true }
}

function message(error: unknown): string {
  return error instanceof AiError || error instanceof SecretError
    ? error.message
    : "Something went wrong"
}

export async function saveGeneralSettings(
  values: GeneralSettingsValues
): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(generalSettingsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  await updateSettings((s) => {
    s.general = parsed.data
  })
  return done()
}

export async function saveWorkflowSettings(
  values: WorkflowSettingsValues
): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(workflowSettingsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  await updateSettings((s) => {
    s.workflow = parsed.data
  })
  return done()
}

export async function saveProvider(
  values: ProviderValues
): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(providerSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  const input = parsed.data

  const endpoint = await checkEndpoint(input.endpoint)
  if (!endpoint.ok) return { ok: false, error: endpoint.error }

  let key: ProviderChange["key"] = { action: "keep" }
  if (input.apiKey) {
    try {
      key = {
        action: "set",
        encrypted: encryptSecret(input.apiKey),
        last4: input.apiKey.slice(-4),
      }
    } catch (error) {
      return { ok: false, error: message(error) }
    }
  }

  const result = await updateSettings((s) =>
    applyProviderInput(
      s,
      {
        id: input.id,
        name: input.name,
        endpoint: endpoint.url,
        key,
        models: input.models,
        defaultModel: input.defaultModel,
      },
      randomUUID
    )
  )
  if (!result.ok) return result
  revalidatePath("/", "layout")
  return { ok: true, id: result.id }
}

export async function deleteProvider(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const removed = await updateSettings((s) => removeProvider(s, id))
  return removed ? done() : { ok: false, error: "Provider not found" }
}

export async function makeDefaultProvider(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const changed = await updateSettings((s) => setDefaultProvider(s, id))
  return changed ? done() : { ok: false, error: "Provider not found" }
}

export async function removeProviderKey(id: string): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const changed = await updateSettings((s) => clearProviderKey(s, id))
  return changed ? done() : { ok: false, error: "Provider not found" }
}

export async function fetchProviderModels(
  values: FetchModelsValues
): Promise<SettingsResult> {
  if (!(await isMD())) return NOT_ALLOWED
  const parsed = parse(fetchModelsSchema, values)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  const { providerId, apiKey: typedKey } = parsed.data

  const endpoint = await checkEndpoint(parsed.data.endpoint)
  if (!endpoint.ok) return { ok: false, error: endpoint.error }

  try {
    const provider = providerId
      ? (await getSettings()).ai.providers.find((p) => p.id === providerId)
      : undefined
    const source = pickKeySource(provider, endpoint.url, typedKey)
    if (!source.ok) return { ok: false, error: source.error }
    const apiKey =
      source.kind === "typed" ? source.key : decryptSecret(source.encrypted)
    return { ok: true, models: await listModels(endpoint.url, apiKey) }
  } catch (error) {
    return { ok: false, error: message(error) }
  }
}
