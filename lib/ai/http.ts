import https from "node:https"
import type { OutgoingHttpHeaders } from "node:http"
import { isIP } from "node:net"
import type { Readable } from "node:stream"

import { isPrivateAddress, PRIVATE_HOST, safeLookup } from "@/lib/ai/endpoint"
import type { FetchLike } from "@/lib/ai/client"

const MAX_BYTES = 1_000_000

// keepAlive reuses the validated socket instead of resolving the host again.
const agent = new https.Agent({ lookup: safeLookup, keepAlive: true })

export async function readCapped(
  stream: Readable,
  limit = MAX_BYTES
): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > limit) throw new Error("The endpoint response was too large")
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

// 204, 205 and 304 must not carry a body; Response throws if one is passed.
export function toResponse(status: number, body: Buffer): Response {
  const bodyless = status === 204 || status === 205 || status === 304
  return new Response(bodyless ? null : new Uint8Array(body), { status })
}

export const safeFetch: FetchLike = (input, init) =>
  new Promise((resolve, reject) => {
    const url = new URL(input)
    // Node skips the lookup hook for IP literals, so check those here.
    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (isIP(host) && isPrivateAddress(host)) {
      reject(new Error(PRIVATE_HOST))
      return
    }
    const body = typeof init.body === "string" ? init.body : undefined
    const headers = { ...(init.headers as Record<string, string> | undefined) }
    if (body !== undefined) {
      headers["content-length"] = String(Buffer.byteLength(body))
    }
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: host,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: init.method ?? "GET",
        headers: headers as OutgoingHttpHeaders,
        agent,
        signal: init.signal ?? undefined,
      },
      (response) => {
        readCapped(response).then((received) => {
          try {
            resolve(toResponse(response.statusCode ?? 500, received))
          } catch (error) {
            reject(error)
          }
        }, reject)
      }
    )
    request.on("error", reject)
    if (body !== undefined) request.write(body)
    request.end()
  })
