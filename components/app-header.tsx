import { Badge } from "@/components/ui/badge"

export function AppHeader({
  description,
  live = false,
}: {
  description?: string
  live?: boolean
}) {
  if (!description && !live) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : (
        <span />
      )}
      {live ? (
        <Badge variant="success" className="gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Today · Live
        </Badge>
      ) : null}
    </div>
  )
}
