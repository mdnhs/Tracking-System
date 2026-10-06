import { AiError } from "@/lib/ai/client"

export const NOT_CONFIGURED =
  "AI is not set up yet. Ask the Managing Director to configure a provider in Settings."

const CONFIG_ERRORS = [
  "No default AI provider is configured",
  "The default AI provider has no default model",
  "The default AI provider has no API key",
]

const CONFIG_PREFIXES = [
  "Stored API key cannot be read",
  "SETTINGS_SECRET is not set",
]

export function generationErrorMessage(error: unknown): string {
  if (!(error instanceof AiError)) return "AI generation failed. Try again."
  if (
    CONFIG_ERRORS.includes(error.message) ||
    CONFIG_PREFIXES.some((prefix) => error.message.startsWith(prefix))
  ) {
    return NOT_CONFIGURED
  }
  return error.message
}
