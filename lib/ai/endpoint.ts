import { lookup } from "node:dns/promises"
import { BlockList, isIP, type LookupFunction } from "node:net"

export type Lookup = (host: string) => Promise<{ address: string }[]>
export type Resolve = (
  host: string
) => Promise<{ address: string; family: number }[]>

export const PRIVATE_HOST =
  "Endpoints on local or private networks are not allowed"

const defaultLookup: Lookup = (host) => lookup(host, { all: true })

const blocked = new BlockList()
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4")
}
// ::/96 covers IPv4-compatible forms; BlockList checks ::ffff:x mapped forms against the IPv4 rules.
for (const [network, prefix] of [
  ["::", 96],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6")
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return blocked.check(ip, "ipv4")
  if (family === 6) return blocked.check(ip, "ipv6")
  return true
}

// Used as the TLS connect lookup, so the address we validate is the address we connect to.
export function makeSafeLookup(resolve: Resolve): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname)
      .then((addresses) => {
        const allowed = addresses.filter((a) => !isPrivateAddress(a.address))
        if (allowed.length === 0) {
          callback(new Error(PRIVATE_HOST), "", 4)
          return
        }
        if (options.all) callback(null, allowed)
        else callback(null, allowed[0].address, allowed[0].family)
      })
      .catch((error: NodeJS.ErrnoException) => callback(error, "", 4))
  }
}

export const safeLookup = makeSafeLookup((host) => lookup(host, { all: true }))

export async function checkEndpoint(
  raw: string,
  lookupFn: Lookup = defaultLookup
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, error: "Enter a valid URL" }
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "The endpoint must use https://" }
  }
  if (url.search || url.hash || url.username || url.password) {
    return {
      ok: false,
      error: "Enter the endpoint without a query, fragment or credentials",
    }
  }

  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, error: PRIVATE_HOST }
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookupFn(host).catch(() => [])
  if (addresses.length === 0) {
    return { ok: false, error: "Could not resolve the endpoint host" }
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    return { ok: false, error: PRIVATE_HOST }
  }
  return { ok: true, url: `${url.origin}${url.pathname.replace(/\/+$/, "")}` }
}
