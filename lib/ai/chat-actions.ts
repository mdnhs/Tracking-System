"use server"

import { buildChatSystemPrompt, CHAT_TIMEOUT_MS } from "@/lib/ai/chat"
import { generateChat } from "@/lib/ai/generate"
import { generationErrorMessage } from "@/lib/ai/generation-error"
import { todayISO } from "@/lib/format"
import { chatRequestSchema } from "@/lib/schemas"
import { getSession } from "@/lib/session"

export interface ChatResult {
  ok: boolean
  reply?: string
  error?: string
}

export async function sendChatMessage(input: {
  messages: { role: "user" | "assistant"; content: string }[]
}): Promise<ChatResult> {
  const parsed = chatRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "That message could not be sent." }
  }

  // The button is only rendered for the MD, but the action must enforce it too.
  const session = await getSession()
  if (session.user.role !== "MD") {
    return {
      ok: false,
      error: "The AI assistant is only available to the Managing Director.",
    }
  }

  try {
    const system = buildChatSystemPrompt(session.all, todayISO())
    const reply = (
      await generateChat({
        system,
        messages: parsed.data.messages,
        timeoutMs: CHAT_TIMEOUT_MS,
      })
    ).trim()
    if (!reply) return { ok: false, error: "The AI provider returned no text" }
    return { ok: true, reply }
  } catch (error) {
    return { ok: false, error: generationErrorMessage(error) }
  }
}
