import { cn } from "@/lib/utils"

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function DonutChart({
  slices,
  size = 168,
  thickness = 26,
  centerLabel,
  centerValue,
  className,
}: {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string | number
  className?: string
}) {
  const total = slices.reduce((acc, s) => acc + s.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const { arcs } = slices.reduce(
    (acc, slice) => {
      const fraction = total === 0 ? 0 : slice.value / total
      const dash = fraction * circumference
      acc.arcs.push({
        ...slice,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -acc.offset,
      })
      acc.offset += dash
      return acc
    },
    { arcs: [] as Array<DonutSlice & { dashArray: string; dashOffset: number }>, offset: 0 }
  )

  const ariaLabel = `Donut chart: ${slices
    .map((s) => `${s.label} ${s.value}`)
    .join(", ")}`

  return (
    <div
      className={cn("flex items-center gap-5", className)}
      data-slot="donut-chart"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-muted"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {centerValue !== undefined ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
              {centerValue}
            </span>
            {centerLabel ? (
              <span className="mt-1 text-xs text-muted-foreground">
                {centerLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="min-w-0 space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate text-muted-foreground">{slice.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
