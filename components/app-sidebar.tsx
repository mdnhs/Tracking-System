"use client"

import * as React from "react"

import {
  Analytics01Icon,
  DashboardSquare01Icon,
  File01Icon,
  Settings01Icon,
  NotebookIcon,
  Task01Icon,
  UserAdd01Icon,
  UserCircle02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { isManagement } from "@/lib/permissions"
import type { Employee } from "@/lib/types"

type NavAccess = "all" | "management" | "md"

const navItems: {
  title: string
  url: string
  icon: typeof Task01Icon
  access: NavAccess
}[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: DashboardSquare01Icon,
    access: "management",
  },
  { title: "Tasks", url: "/tasks", icon: Task01Icon, access: "all" },
  {
    title: "Daily Reports",
    url: "/reports",
    icon: NotebookIcon,
    access: "management",
  },
  {
    title: "My Workspace",
    url: "/employee",
    icon: UserCircle02Icon,
    access: "all",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: Analytics01Icon,
    access: "management",
  },
  {
    title: "Management Reports",
    url: "/overview",
    icon: File01Icon,
    access: "management",
  },
  {
    title: "Structure",
    url: "/structure",
    icon: UserGroupIcon,
    access: "all",
  },
  {
    title: "Organization",
    url: "/organization",
    icon: UserAdd01Icon,
    access: "md",
  },
  { title: "Settings", url: "/settings", icon: Settings01Icon, access: "md" },
]

export function AppSidebar({
  user,
  users,
  companyName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: Employee
  users: Employee[]
  companyName: string
}) {
  const management = isManagement(user)
  const items = navItems
    .filter(
      (item) =>
        item.access === "all" ||
        (item.access === "management" && management) ||
        (item.access === "md" && user.role === "MD")
    )
    .map((item) =>
      management && item.url === "/employee"
        ? { ...item, title: "Employee Workspace" }
        : item
    )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="group-data-[collapsible=icon]:p-1! data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href={management ? "/dashboard" : "/employee"} />}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <HugeiconsIcon
                  icon={Task01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">TrackSys</span>
                <span className="truncate text-xs text-muted-foreground">
                  {companyName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} users={users} />
      </SidebarFooter>
    </Sidebar>
  )
}
