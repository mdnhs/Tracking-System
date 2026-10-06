import { chatCompletion, AiError } from "@/lib/ai/client"
import { checkEndpoint } from "@/lib/ai/endpoint"
import { decryptSecret, SecretError } from "@/lib/crypto"
import { getSettings } from "@/lib/settings"

export async function generateText(input: {
  prompt: string
  system?: string
  model?: string
}): Promise<string> {
  const { ai } = await getSettings()
  const provider = ai.providers.find((p) => p.id === ai.defaultProviderId)
  if (!provider) throw new AiError("No default AI provider is configured")
  const model = input.model ?? provider.defaultModel
  if (!model) throw new AiError("The default AI provider has no default model")
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

  return chatCompletion(endpoint.url, apiKey, {
    model,
    messages: [
      ...(input.system
        ? [{ role: "system" as const, content: input.system }]
        : []),
      { role: "user" as const, content: input.prompt },
    ],
  })
}
