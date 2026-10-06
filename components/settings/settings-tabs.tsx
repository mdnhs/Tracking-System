"use client"

import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type SettingsTab = "general" | "workflow" | "ai"

export function SettingsTabs({
  tab,
  general,
  workflow,
  ai,
}: {
  tab: SettingsTab
  general: ReactNode
  workflow: ReactNode
  ai: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        router.replace(`${pathname}?tab=${value}`, { scroll: false })
      }
    >
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
        <TabsTrigger value="ai">AI</TabsTrigger>
      </TabsList>
      <TabsContent value="general">{general}</TabsContent>
      <TabsContent value="workflow">{workflow}</TabsContent>
      <TabsContent value="ai">{ai}</TabsContent>
    </Tabs>
  )
}
