"use server"

import { generateText } from "@/lib/ai/generate"
import { generationErrorMessage } from "@/lib/ai/generation-error"
import { buildPrompt } from "@/lib/ai/prompts"
import { aiFieldSchema, type AiFieldValues } from "@/lib/schemas"

export interface GenerateResult {
  ok: boolean
  text?: string
  error?: string
}

export async function generateFieldText(
  values: AiFieldValues
): Promise<GenerateResult> {
  const parsed = aiFieldSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: "AI generation failed. Try again." }
  }
  try {
    const { system, prompt } = buildPrompt(
      parsed.data.field,
      parsed.data.context
    )
    const text = (await generateText({ prompt, system })).trim()
    if (!text) return { ok: false, error: "The AI provider returned no text" }
    return { ok: true, text }
  } catch (error) {
    return { ok: false, error: generationErrorMessage(error) }
  }
}
