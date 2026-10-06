import { cn } from "@/lib/utils"

export interface BarDatum {
  label: string
  values: number[]
}

export function GroupedBarChart({
  data,
  series,
  colors,
  height = 220,
  className,
}: {
  data: BarDatum[]
  series: string[]
  colors: string[]
  height?: number
  className?: string
}) {
  const max = Math.max(...data.flatMap((d) => d.values), 1)
  const ticks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)))
  )

  const ariaLabel = `Bar chart. ${series
    .map((name, i) => `${name}: ${data.map((d) => d.values[i]).join(", ")}`)
    .join(". ")}`

  return (
    <div
      className={cn("space-y-3", className)}
      data-slot="bar-chart"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex gap-4 text-xs text-muted-foreground">
        {series.map((name, i) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
            {name}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <div
          className="flex w-6 shrink-0 flex-col-reverse justify-between text-right text-xs text-muted-foreground tabular-nums"
          style={{ height }}
        >
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col-reverse justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-border/70" />
            ))}
          </div>

          <div className="relative flex h-full items-end justify-between gap-1" style={{ height }}>
            {data.map((d) => (
              <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="flex items-end justify-center gap-0.5">
                  {d.values.map((v, i) => (
                    <div
                      key={i}
                      title={`${series[i]}: ${v}`}
                      className="w-full max-w-4 rounded-t-sm"
                      style={{ height: `${(v / max) * 100}%`, backgroundColor: colors[i] }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-1 pl-8">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 text-center text-xs text-muted-foreground"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
