import { cn } from "@/lib/utils"

export interface LineDatum {
  label: string
  value: number
}

export function LineChart({
  data,
  height = 220,
  color = "#10b981",
  yLabel,
  className,
}: {
  data: LineDatum[]
  height?: number
  color?: string
  yLabel?: string
  className?: string
}) {
  const width = 640
  const padX = 8
  const padTop = 16
  const padBottom = 4
  const max = Math.max(...data.map((d) => d.value), 1)
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0
  const usable = height - padTop - padBottom

  const points = data.map((d, i) => ({
    x: padX + i * step,
    y: padTop + usable - (d.value / max) * usable,
    ...d,
  }))

  if (points.length === 0) return null

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const area = `${path} L${points[points.length - 1].x},${height - padBottom} L${points[0].x},${height - padBottom} Z`

  const ticks = [0, Math.round(max / 2), max]

  const ariaLabel = `Line chart: ${data
    .map((d) => `${d.label} ${d.value}`)
    .join(", ")}`

  return (
    <div
      className={cn("space-y-3", className)}
      data-slot="line-chart"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex gap-2">
        <div
          className="flex w-6 shrink-0 flex-col-reverse justify-between text-right text-xs text-muted-foreground tabular-nums"
          style={{ height }}
        >
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height }}>
          <div className="absolute inset-0 flex flex-col-reverse justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-border/70" />
            ))}
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <path d={area} fill={color} opacity={0.12} />
            <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p) => (
              <circle key={p.label} cx={p.x} cy={p.y} r={3.5} fill={color} />
            ))}
          </svg>

          {points.map((p) => (
            <span
              key={p.label}
              className="absolute -translate-x-1/2 -translate-y-full rounded bg-foreground px-1 py-0.5 text-xs font-medium text-background tabular-nums"
              style={{ left: `${(p.x / width) * 100}%`, top: `${p.y - 6}px` }}
            >
              {p.value}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-between pl-8">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
      {yLabel ? (
        <p className="text-center text-xs text-muted-foreground">{yLabel}</p>
      ) : null}
    </div>
  )
}
