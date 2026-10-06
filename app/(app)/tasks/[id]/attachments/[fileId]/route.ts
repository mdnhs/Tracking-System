import type { NextRequest } from "next/server"

import { readAttachment } from "@/lib/attachments"
import { getSession } from "@/lib/session"

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/tasks/[id]/attachments/[fileId]">
) {
  const { id, fileId } = await ctx.params
  const { data } = await getSession()
  const attachment = data.tasks
    .find((t) => t.id === id)
    ?.attachments.find((a) => a.id === fileId)
  if (!attachment) return new Response("Not found", { status: 404 })

  let body: Buffer
  try {
    body = await readAttachment(id, fileId)
  } catch {
    return new Response("Not found", { status: 404 })
  }

  // Always download, never render inline: uploads are untrusted content.
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
