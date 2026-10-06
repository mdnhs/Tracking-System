import { chatCompletion, AiError, type ChatMessage } from "@/lib/ai/client"
import { checkEndpoint } from "@/lib/ai/endpoint"
import { decryptSecret, SecretError } from "@/lib/crypto"
import { getSettings } from "@/lib/settings"

interface ResolvedProvider {
  endpoint: string
  apiKey: string
  model: string
}

async function resolveProvider(model?: string): Promise<ResolvedProvider> {
  const { ai } = await getSettings()
  const provider = ai.providers.find((p) => p.id === ai.defaultProviderId)
  if (!provider) throw new AiError("No default AI provider is configured")
  const chosen = model ?? provider.defaultModel
  if (!chosen) throw new AiError("The default AI provider has no default model")
  if (!provider.apiKeyEncrypted) {
    throw new AiError("The default AI provider has no API key")
  }

  let apiKey: string
  try {
    apiKey = decryptSecret(provider.apiKeyEncrypted)
  } catch (error) {
    throw new AiError(
      error instanceof SecretError ? error.message : "API key error"
    )
  }
  const endpoint = await checkEndpoint(provider.endpoint)
  if (!endpoint.ok) throw new AiError(endpoint.error)

  return { endpoint: endpoint.url, apiKey, model: chosen }
}

export async function generateText(input: {
  prompt: string
  system?: string
  model?: string
}): Promise<string> {
  const { endpoint, apiKey, model } = await resolveProvider(input.model)
  return chatCompletion(endpoint, apiKey, {
    model,
    messages: [
      ...(input.system
        ? [{ role: "system" as const, content: input.system }]
        : []),
      { role: "user" as const, content: input.prompt },
    ],
  })
}

export async function generateChat(input: {
  system: string
  messages: Pick<ChatMessage, "role" | "content">[]
  model?: string
  timeoutMs?: number
}): Promise<string> {
  const { endpoint, apiKey, model } = await resolveProvider(input.model)
  return chatCompletion(
    endpoint,
    apiKey,
    {
      model,
      messages: [{ role: "system", content: input.system }, ...input.messages],
    },
    undefined,
    input.timeoutMs
  )
}
