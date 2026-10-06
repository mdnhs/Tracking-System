import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

export class SecretError extends Error {}

const MIN_SECRET_LENGTH = 16
const UNREADABLE = "Stored API key cannot be read — enter it again"

export function hasSettingsSecret(): boolean {
  return (process.env.SETTINGS_SECRET ?? "").length >= MIN_SECRET_LENGTH
}

function key(): Buffer {
  if (!hasSettingsSecret()) {
    throw new SecretError(
      "SETTINGS_SECRET is not set. Add it to .env.local (at least 16 characters) and restart the server."
    )
  }
  return createHash("sha256").update(process.env.SETTINGS_SECRET!).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64"))
    .join(":")
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(":")
  if (parts.length !== 3) throw new SecretError(UNREADABLE)
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64"))
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    )
  } catch (error) {
    if (error instanceof SecretError) throw error
    throw new SecretError(UNREADABLE)
  }
}
