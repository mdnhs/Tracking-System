"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { STATUS_COLORS } from "@/lib/constants"

export interface TrendPoint {
  week: string
  completed: number
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: STATUS_COLORS.completed,
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: { data: TrendPoint[] }) {
  const [range, setRange] = React.useState("8w")
  const filtered = range === "4w" ? data.slice(-4) : data

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Task Completion Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Tasks completed per week
          </span>
          <span className="@[540px]/card:hidden">Per week</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[range]}
            onValueChange={(value) => setRange(value[0] ?? "8w")}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="8w">Last 8 weeks</ToggleGroupItem>
            <ToggleGroupItem value="4w">Last 4 weeks</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
          role="img"
          aria-label={`Task completion trend. ${filtered
            .map((d) => `${d.week} ${d.completed}`)
            .join(", ")}`}
        >
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-completed)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-completed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="completed"
              type="natural"
              fill="url(#fillCompleted)"
              stroke="var(--color-completed)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
