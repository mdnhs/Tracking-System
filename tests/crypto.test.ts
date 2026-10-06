import assert from "node:assert/strict"
import { test } from "node:test"

import {
  decryptSecret,
  encryptSecret,
  hasSettingsSecret,
  SecretError,
} from "@/lib/crypto"

const SECRET = "test-secret-at-least-16-chars"

test("round trip with a fresh IV each time", () => {
  process.env.SETTINGS_SECRET = SECRET
  const a = encryptSecret("gsk_live_key_1234")
  const b = encryptSecret("gsk_live_key_1234")
  assert.notEqual(a, b)
  assert.equal(a.split(":").length, 3)
  assert.equal(a.includes("gsk_live_key_1234"), false)
  assert.equal(decryptSecret(a), "gsk_live_key_1234")
})

test("a different secret cannot decrypt", () => {
  process.env.SETTINGS_SECRET = SECRET
  const stored = encryptSecret("key")
  process.env.SETTINGS_SECRET = "another-secret-16-chars-long"
  assert.throws(() => decryptSecret(stored), SecretError)
})

test("tampered ciphertext is rejected", () => {
  process.env.SETTINGS_SECRET = SECRET
  const [iv, tag, data] = encryptSecret("key").split(":")
  const flipped = Buffer.from(data, "base64")
  flipped[0] ^= 1
  assert.throws(
    () => decryptSecret([iv, tag, flipped.toString("base64")].join(":")),
    SecretError
  )
})

test("missing or short secret", () => {
  delete process.env.SETTINGS_SECRET
  assert.equal(hasSettingsSecret(), false)
  assert.throws(() => encryptSecret("key"), SecretError)
  process.env.SETTINGS_SECRET = "short"
  assert.equal(hasSettingsSecret(), false)
  process.env.SETTINGS_SECRET = SECRET
  assert.equal(hasSettingsSecret(), true)
})
