export type TaskStatusKey =
  "pending" | "in-progress" | "completed" | "overdue" | "on-hold" | "cancelled"

export type Priority = "high" | "medium" | "low"

export interface Meta {
  company: string
  system: string
  preparedBy: string
  date: string
  tagline: string
  illustrative: boolean
}

export interface HierarchyLevel {
  role: string
  level: number
  responsibility: string
}

export interface Employee {
  id: string
  name: string
  role: string
  department: string
}

export interface TaskStatus {
  key: TaskStatusKey
  label: string
  description: string
}

export interface TaskUpdate {
  author: string
  text: string
  at: string
}

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  uploadedBy: string
}

export interface Task {
  id: string
  title: string
  description: string
  assignedTo: string
  assignedBy: string
  department: string
  priority: Priority
  startDate: string
  deadline: string
  project: string
  attachments: Attachment[]
  status: TaskStatusKey
  acceptedAt: string | null
  completedAt: string | null
  delayReason: string | null
  delayExplanation: string | null
  holdReason: string | null
  comments: number
  updates?: TaskUpdate[]
}

export interface MorningReport {
  submitted: boolean
  priorities: string[]
  plannedWork: string[]
  importantTasks: string[]
  blockers: string[]
}

export interface EveningReport {
  submitted: boolean
  completed: string[]
  ongoing: string[]
  pending: string[]
  problems: string
  incompleteReason: string
}

export interface DailyReport {
  date: string
  employeeId: string
  morning: MorningReport
  evening: EveningReport
}

export interface WorkloadEntry {
  employee: string
  assigned: number
  completed: number
}

export interface TrendEntry {
  week: string
  completed: number
}

export interface DelayEntry {
  reason: string
  count: number
  percent: number
}

export interface VisibilityQuestion {
  key: string
  question: string
}

export interface Benefit {
  key: string
  title: string
  description: string
}

export interface TrackingData {
  meta: Meta
  hierarchy: HierarchyLevel[]
  employees: Employee[]
  taskStatuses: TaskStatus[]
  delayReasons: string[]
  tasks: Task[]
  dailyReports: DailyReport[]
  visibilityQuestions: VisibilityQuestion[]
  benefits: Benefit[]
  futureScalability: string[]
}
