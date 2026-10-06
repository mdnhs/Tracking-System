"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname } from "next/navigation"

import { AiChat } from "@/components/ai-chat"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles: Record<string, string> = {
  "/dashboard": "Management Overview",
  "/tasks": "Task Management",
  "/reports": "Daily Employee Reporting",
  "/employee": "My Workspace",
  "/analytics": "Visual Analytics",
  "/overview": "Management Reports",
  "/settings": "Settings",
  "/structure": "Structure",
  "/organization": "Organization",
}

function titleFor(pathname: string) {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith("/tasks/")) return "Task Detail"
  const match = Object.keys(titles).find((key) =>
    pathname.startsWith(key + "/")
  )
  return match ? titles[match] : "TrackSys"
}

export function SiteHeader({ isMd = false }: { isMd?: boolean }) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 rounded-t-xl border-b bg-background transition-[width,height] ease-linear print:hidden">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="font-heading text-base font-medium">
          {titleFor(pathname)}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {isMd ? <AiChat /> : null}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle theme"
          >
            <HugeiconsIcon
              icon={resolvedTheme === "dark" ? Sun03Icon : Moon02Icon}
              strokeWidth={2}
            />
          </Button>
        </div>
      </div>
    </header>
  )
}
