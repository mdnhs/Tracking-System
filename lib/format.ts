export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA")
}
