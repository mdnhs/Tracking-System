import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { GroupedBarChart } from "@/components/charts/bar-chart"
import { LineChart } from "@/components/charts/line-chart"
import { TaskStatusCard } from "@/components/task-status-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { completionTrend, delayAnalysis, workload } from "@/lib/analytics"
import { countTasks } from "@/lib/data"
import { formatDate, todayISO } from "@/lib/format"
import { requireManagement } from "@/lib/session"

const DELAY_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6", "#9ca3af"]

export default async function AnalyticsPage() {
  const { data } = await requireManagement()
  const today = todayISO()
  const counts = countTasks(data.tasks, today)
  const trend = completionTrend(data.tasks, today)
  const delays = delayAnalysis(data.tasks)

  return (
    <>
      <AppHeader description="Charts that turn daily activity into clear management insight." />

      <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Live — every chart is computed from the current task records.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskStatusCard counts={counts} />

        <Card>
          <CardHeader>
            <CardTitle>Task Completion Trend</CardTitle>
            <CardDescription>
              Tasks completed per week, last 8 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={trend.map((t) => ({
                label: formatDate(t.week),
                value: t.completed,
              }))}
              yLabel="Tasks completed per week"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Workload</CardTitle>
            <CardDescription>
              Assigned vs completed per employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={workload(data.tasks, data.employees).map((w) => ({
                label: w.employee,
                values: [w.assigned, w.completed],
              }))}
              series={["Assigned", "Completed"]}
              colors={["#3b82f6", "#10b981"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delay Reason Analysis</CardTitle>
            <CardDescription>Why delayed work slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {delays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delay reasons recorded yet.
              </p>
            ) : null}
            {delays.map((d, i) => (
              <div key={d.reason} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.reason}</span>
                  <span className="font-medium tabular-nums">
                    {d.count} · {d.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.percent}%`,
                      backgroundColor: DELAY_COLORS[i % DELAY_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reporting & Analytics</CardTitle>
          <CardDescription>
            Daily, weekly and monthly management reports with CSV and PDF export
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/overview" />}
            >
              Open reports
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                data-icon="inline-end"
              />
            </Button>
          </CardAction>
        </CardHeader>
      </Card>
    </>
  )
}
