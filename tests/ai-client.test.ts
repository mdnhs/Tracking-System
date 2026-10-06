import assert from "node:assert/strict"
import { test } from "node:test"

import { AiError, chatCompletion, listModels } from "@/lib/ai/client"

const KEY = "gsk_secret_value_9876"

function stub(
  status: number,
  body: unknown,
  seen: { url?: string; init?: RequestInit } = {}
) {
  return async (url: string, init: RequestInit) => {
    seen.url = url
    seen.init = init
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body),
      { status }
    )
  }
}

test("listModels sends the key, strips Gemini prefixes, dedupes and sorts", async () => {
  const seen: { url?: string; init?: RequestInit } = {}
  const models = await listModels(
    "https://example.com/v1",
    KEY,
    stub(
      200,
      {
        data: [
          { id: "models/gemini-2.0-flash" },
          { id: "b-model" },
          { id: "gemini-2.0-flash" },
          { name: "no-id" },
        ],
      },
      seen
    )
  )
  assert.deepEqual(models, ["b-model", "gemini-2.0-flash"])
  assert.equal(seen.url, "https://example.com/v1/models")
  assert.equal(
    new Headers(seen.init?.headers).get("authorization"),
    `Bearer ${KEY}`
  )
  assert.equal(seen.init?.redirect, "error")
})

test("401 and 403 mean the key was rejected", async () => {
  for (const status of [401, 403]) {
    await assert.rejects(
      listModels("https://e.com/v1", KEY, stub(status, {})),
      {
        message: "API key was rejected by the provider",
      }
    )
  }
})

test("provider errors never echo the key", async () => {
  const error = await listModels(
    "https://e.com/v1",
    KEY,
    stub(500, { error: { message: `bad key ${KEY} for model` } })
  ).catch((e: unknown) => e)
  assert.ok(error instanceof AiError)
  assert.equal(error.message.includes(KEY), false)
  assert.match(error.message, /^Provider error \(500\)/)
})

test("network failure and bad shapes", async () => {
  await assert.rejects(
    listModels("https://e.com/v1", KEY, async () => {
      throw new TypeError("fetch failed")
    }),
    { message: "Could not reach the endpoint" }
  )
  await assert.rejects(
    listModels("https://e.com/v1", KEY, stub(200, "<html>")),
    {
      message: "The endpoint did not return an OpenAI-compatible response",
    }
  )
  await assert.rejects(
    listModels("https://e.com/v1", KEY, stub(200, { models: [] })),
    {
      message: "The endpoint did not return an OpenAI-compatible response",
    }
  )
})

test("chatCompletion posts messages and returns the first choice", async () => {
  const seen: { url?: string; init?: RequestInit } = {}
  const text = await chatCompletion(
    "https://e.com/v1",
    KEY,
    { model: "m", messages: [{ role: "user", content: "Hi" }] },
    stub(200, { choices: [{ message: { content: "Hello" } }] }, seen)
  )
  assert.equal(text, "Hello")
  assert.equal(seen.url, "https://e.com/v1/chat/completions")
  assert.equal(seen.init?.method, "POST")
  assert.deepEqual(JSON.parse(String(seen.init?.body)), {
    model: "m",
    messages: [{ role: "user", content: "Hi" }],
  })
})
