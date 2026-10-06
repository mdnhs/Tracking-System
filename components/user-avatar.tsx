import { cn } from "cn"

import { Avatar as AvatarPrimitive, AvatarFallback } from "@/components/ui/avatar"

const palette = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function Avatar({
  name,
  seed = name,
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive> & {
  name: string
  seed?: string
}) {
  const index =
    seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    palette.length
  return (
    <AvatarPrimitive className={cn("size-8", className)} {...props}>
      <AvatarFallback
        className={cn("text-xs font-semibold", palette[index])}
      >
        {initials(name)}
      </AvatarFallback>
    </AvatarPrimitive>
  )
}
