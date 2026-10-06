import { DonutChart } from "@/components/charts/donut-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { STATUS_COLORS } from "@/lib/constants"
import type { TaskCounts } from "@/lib/data"

export function TaskStatusCard({ counts }: { counts: TaskCounts }) {
  const total =
    counts.completed + counts.inProgress + counts.pending + counts.overdue

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Status Distribution</CardTitle>
        <CardDescription>Current state of all {total} tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <DonutChart
          centerValue={total}
          centerLabel="tasks"
          slices={[
            {
              label: "Completed",
              value: counts.completed,
              color: STATUS_COLORS.completed,
            },
            {
              label: "In Progress",
              value: counts.inProgress,
              color: STATUS_COLORS["in-progress"],
            },
            {
              label: "Pending",
              value: counts.pending,
              color: STATUS_COLORS.pending,
            },
            {
              label: "Overdue",
              value: counts.overdue,
              color: STATUS_COLORS.overdue,
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}
