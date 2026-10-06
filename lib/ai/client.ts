import { safeFetch } from "@/lib/ai/http"

export class AiError extends Error {}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

const TIMEOUT_MS = 15_000
const NOT_COMPATIBLE =
  "The endpoint did not return an OpenAI-compatible response"

async function request(
  url: string,
  apiKey: string,
  init: RequestInit,
  fetchImpl: FetchLike
): Promise<unknown> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      ...init,
      // A redirect could point the server at an address checkEndpoint never saw.
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${apiKey}`,
      },
    })
  } catch {
    throw new AiError("Could not reach the endpoint")
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiError("API key was rejected by the provider")
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => String(body?.error?.message ?? ""))
      .catch(() => "")
    const safe = detail.split(apiKey).join("••••").slice(0, 120)
    throw new AiError(
      `Provider error (${response.status})${safe ? `: ${safe}` : ""}`
    )
  }
  try {
    return await response.json()
  } catch {
    throw new AiError(NOT_COMPATIBLE)
  }
}

export async function listModels(
  endpoint: string,
  apiKey: string,
  fetchImpl: FetchLike = safeFetch
): Promise<string[]> {
  const body = await request(
    `${endpoint}/models`,
    apiKey,
    { method: "GET" },
    fetchImpl
  )
  const data = (body as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) throw new AiError(NOT_COMPATIBLE)
  const ids = data
    .map((model) => (model as { id?: unknown }).id)
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.replace(/^models\//, ""))
  return [...new Set(ids)].sort()
}

export async function chatCompletion(
  endpoint: string,
  apiKey: string,
  body: {
    model: string
    messages: { role: "system" | "user"; content: string }[]
  },
  fetchImpl: FetchLike = safeFetch
): Promise<string> {
  const result = await request(
    `${endpoint}/chat/completions`,
    apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fetchImpl
  )
  const content = (
    result as { choices?: { message?: { content?: unknown } }[] } | null
  )?.choices?.[0]?.message?.content
  if (typeof content !== "string") throw new AiError(NOT_COMPATIBLE)
  return content
}
