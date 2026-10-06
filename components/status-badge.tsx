import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HourglassIcon,
  PauseCircleIcon,
  ProgressIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import type { CompletionTiming } from "@/lib/tasks"
import type { TaskStatusKey } from "@/lib/types"
import { cn } from "@/lib/utils"

const config: Record<
  TaskStatusKey,
  {
    label: string
    variant: "warning" | "info" | "success" | "danger" | "muted"
    icon: typeof HourglassIcon
  }
> = {
  pending: { label: "Pending", variant: "warning", icon: HourglassIcon },
  "in-progress": { label: "In Progress", variant: "info", icon: ProgressIcon },
  completed: {
    label: "Completed",
    variant: "success",
    icon: CheckmarkCircle02Icon,
  },
  overdue: { label: "Overdue", variant: "danger", icon: Alert02Icon },
  "on-hold": { label: "On Hold", variant: "muted", icon: PauseCircleIcon },
  cancelled: { label: "Cancelled", variant: "muted", icon: CancelCircleIcon },
}

function StatusBadge({
  status,
  className,
}: {
  status: TaskStatusKey
  className?: string
}) {
  const { label, variant, icon } = config[status]
  return (
    <Badge variant={variant} className={cn("uppercase", className)}>
      <HugeiconsIcon icon={icon} strokeWidth={2} />
      {label}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const variant =
    priority === "high" ? "danger" : priority === "medium" ? "warning" : "muted"
  return (
    <Badge variant={variant} className="capitalize">
      {priority}
    </Badge>
  )
}

function TimingBadge({ timing }: { timing: CompletionTiming }) {
  return timing === "late" ? (
    <Badge variant="danger">Completed late</Badge>
  ) : (
    <Badge variant="success">On time</Badge>
  )
}

export { StatusBadge, PriorityBadge, TimingBadge }
