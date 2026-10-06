import { cn } from "@/lib/utils"

export function ReportGroup({
  label,
  items,
  tone = "default",
}: {
  label: string
  items: string[]
  tone?: "default" | "warning"
}) {
  if (items.length === 0) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "w-24 shrink-0 text-xs font-semibold tracking-wide uppercase",
          tone === "warning"
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="text-muted-foreground">{items.join(", ")}</span>
    </div>
  )
}
