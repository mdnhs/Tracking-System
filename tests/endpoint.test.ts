import assert from "node:assert/strict"
import { test } from "node:test"

import {
  checkEndpoint,
  isPrivateAddress,
  makeSafeLookup,
} from "@/lib/ai/endpoint"

const publicLookup = async () => [{ address: "104.18.2.1" }]
const privateLookup = async () => [{ address: "10.0.0.5" }]

test("isPrivateAddress", () => {
  for (const ip of [
    "10.1.2.3",
    "127.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "172.31.255.255",
    "169.254.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.0.1",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "255.255.255.255",
    "::1",
    "fd00::1",
    "fe80::1",
    "fec0::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip)
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "104.18.2.1", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip)
  }
})

test("accepts https and strips the trailing slash", async () => {
  assert.deepEqual(
    await checkEndpoint("https://api.groq.com/openai/v1/", publicLookup),
    { ok: true, url: "https://api.groq.com/openai/v1" }
  )
})

test("rejects http, bad URLs and private hosts", async () => {
  assert.deepEqual(await checkEndpoint("http://api.groq.com", publicLookup), {
    ok: false,
    error: "The endpoint must use https://",
  })
  assert.deepEqual(await checkEndpoint("not a url", publicLookup), {
    ok: false,
    error: "Enter a valid URL",
  })
  for (const url of [
    "https://localhost/v1",
    "https://api.localhost",
    "https://127.0.0.1/v1",
    "https://[::1]/v1",
  ]) {
    const result = await checkEndpoint(url, publicLookup)
    assert.equal(result.ok, false, url)
  }
  const resolvedPrivate = await checkEndpoint(
    "https://internal.example",
    privateLookup
  )
  assert.equal(resolvedPrivate.ok, false)
})

test("rejects a query, fragment or credentials", async () => {
  for (const url of [
    "https://api.groq.com/openai/v1?x=1",
    "https://api.groq.com/openai/v1#models",
    "https://user:pass@api.groq.com/openai/v1",
  ]) {
    const result = await checkEndpoint(url, publicLookup)
    assert.deepEqual(result, {
      ok: false,
      error: "Enter the endpoint without a query, fragment or credentials",
    })
  }
})

test("makeSafeLookup refuses private answers and keeps a public one", async () => {
  const privateOnly = makeSafeLookup(async () => [
    { address: "10.0.0.5", family: 4 },
  ])
  const error = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
    privateOnly("host.example", {}, (e) => resolve(e))
  )
  assert.equal(
    error?.message,
    "Endpoints on local or private networks are not allowed"
  )

  const mixed = makeSafeLookup(async () => [
    { address: "10.0.0.5", family: 4 },
    { address: "104.18.2.1", family: 4 },
  ])
  const address = await new Promise<string | undefined>((resolve) =>
    mixed("host.example", {}, (_e, a) =>
      resolve(typeof a === "string" ? a : undefined)
    )
  )
  assert.equal(address, "104.18.2.1")
})

test("unresolvable host", async () => {
  const result = await checkEndpoint("https://nope.example", async () => {
    throw new Error("ENOTFOUND")
  })
  assert.deepEqual(result, {
    ok: false,
    error: "Could not resolve the endpoint host",
  })
})

test("IPv4-mapped and IPv4-compatible IPv6 forms are private", async () => {
  for (const ip of [
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "::7f00:1",
    "::ffff:0a00:0001",
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip)
  }
  for (const url of [
    "https://[::ffff:127.0.0.1]/v1",
    "https://[::ffff:169.254.169.254]/",
    "https://[::127.0.0.1]/",
  ]) {
    assert.equal((await checkEndpoint(url, publicLookup)).ok, false, url)
  }
  const mappedAnswer = await checkEndpoint(
    "https://rebind.example",
    async () => [{ address: "::ffff:7f00:1" }]
  )
  assert.equal(mappedAnswer.ok, false)
  assert.equal(isPrivateAddress("::ffff:808:808"), false)
})
