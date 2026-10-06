import assert from "node:assert/strict"
import { Readable } from "node:stream"
import { test } from "node:test"

import { PRIVATE_HOST } from "@/lib/ai/endpoint"
import { readCapped, safeFetch, toResponse } from "@/lib/ai/http"

test("readCapped returns a small body", async () => {
  const body = await readCapped(Readable.from([Buffer.from("hello")]))
  assert.equal(body.toString(), "hello")
})

test("readCapped rejects a body over the limit", async () => {
  const stream = Readable.from([Buffer.alloc(600_000), Buffer.alloc(600_000)])
  await assert.rejects(readCapped(stream, 1_000_000), {
    message: "The endpoint response was too large",
  })
})

test("toResponse drops the body for 204, 205 and 304", () => {
  for (const status of [204, 205, 304]) {
    assert.equal(toResponse(status, Buffer.alloc(0)).status, status)
  }
  const ok = toResponse(200, Buffer.from("hi"))
  assert.equal(ok.status, 200)
  assert.equal(ok.ok, true)
})

test("safeFetch refuses private hosts without connecting", async () => {
  for (const url of [
    "https://127.0.0.1/v1",
    "https://[::1]/v1",
    "https://[::ffff:127.0.0.1]/v1",
    "https://localhost/v1",
  ]) {
    await assert.rejects(safeFetch(url, { method: "GET" }), {
      message: PRIVATE_HOST,
    })
  }
})
