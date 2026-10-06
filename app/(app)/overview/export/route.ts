import type { NextRequest } from "next/server"

import { todayISO } from "@/lib/format"
import { buildOverview, isPeriod, overviewCsv } from "@/lib/overview"
import { isManagement } from "@/lib/permissions"
import { getSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  const { user, data } = await getSession()
  if (!isManagement(user)) return new Response("Forbidden", { status: 403 })

  const requested = request.nextUrl.searchParams.get("period") ?? undefined
  const period = isPeriod(requested) ? requested : "weekly"
  const today = todayISO()
  const csv = overviewCsv(buildOverview(data, period, today))

  // BOM lets Excel detect UTF-8 for names with accents.
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${period}-overview-${today}.csv"`,
    },
  })
}
