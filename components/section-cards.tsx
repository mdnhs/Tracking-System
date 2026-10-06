import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface SectionCardData {
  label: string
  value: string | number
  badge?: string
  trend?: "up" | "down" | "neutral"
  footer: string
}

function TrendBadge({
  text,
  trend = "neutral",
}: {
  text: string
  trend?: "up" | "down" | "neutral"
}) {
  const Icon = trend === "down" ? ChartDownIcon : ChartUpIcon
  return (
    <Badge variant="outline">
      {trend === "neutral" ? null : (
        <HugeiconsIcon icon={Icon} strokeWidth={2} />
      )}
      {text}
    </Badge>
  )
}

export function SectionCards({ cards }: { cards: SectionCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="flex flex-wrap items-center gap-2 text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl">
              {card.value}
              {card.badge ? (
                <TrendBadge text={card.badge} trend={card.trend} />
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            <div className="line-clamp-1">{card.footer}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
