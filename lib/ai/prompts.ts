import type { AiField, AiFieldContext } from "@/lib/ai/fields"

const SYSTEM =
  "You help write concise, professional content for a work management app. Reply with the requested text only — no preamble, no quotes and no markdown."

const INSTRUCTIONS: Record<AiField, string> = {
  "task-description":
    "Write a clear description of the work this task involves, in 1-3 sentences.",
  "task-update":
    "Write a brief progress update for this task, in 1-2 sentences.",
  "delay-explanation":
    "Write a brief, factual explanation of why this task is delayed.",
  "morning-priorities":
    "List 2-4 priorities for today, one per line, without numbering.",
  "morning-planned-work":
    "List 2-4 pieces of work planned for today, one per line, without numbering.",
  "morning-important-tasks":
    "List 1-3 important tasks for today, one per line, without numbering.",
  "morning-blockers":
    "List any likely blockers for today, one per line, without numbering. If there are none, reply with None.",
  "evening-completed":
    "List the work completed today, one item per line, without numbering.",
  "evening-ongoing":
    "List the work still in progress, one item per line, without numbering.",
  "evening-pending":
    "List the work still pending, one item per line, without numbering.",
  "evening-problems":
    "Write a short note on any problems faced today, or None.",
  "evening-incomplete-reason":
    "Write a short reason why some tasks were not finished today.",
}

const MAX_FACT = 200

function fact(label: string, value?: string): string | undefined {
  // Collapse whitespace so a value cannot inject extra prompt lines.
  const clean = value?.replace(/\s+/g, " ").trim().slice(0, MAX_FACT)
  return clean ? `${label}: ${clean}` : undefined
}

export function buildPrompt(
  field: AiField,
  context: AiFieldContext = {}
): { system: string; prompt: string } {
  const facts = [
    fact("Task", context.title),
    fact("Project/client", context.project),
    fact("Department", context.department),
    fact("Recorded delay reason", context.reason),
    fact("Employee", context.employee),
  ].filter((line): line is string => line !== undefined)
  return {
    system: SYSTEM,
    prompt: [...facts, INSTRUCTIONS[field]].join("\n"),
  }
}
