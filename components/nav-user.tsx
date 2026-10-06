"use client"

import { MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTransition } from "react"

import { Avatar } from "@/components/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { switchUser } from "@/lib/actions"
import type { Employee } from "@/lib/types"

export function NavUser({
  user,
  users,
}: {
  user: Employee
  users: Employee[]
}) {
  const { isMobile } = useSidebar()
  const [pending, startTransition] = useTransition()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted"
                disabled={pending}
              />
            }
          >
            <Avatar name={user.name} seed={user.id} className="size-8" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {pending ? "Switching…" : `${user.role} · ${user.department}`}
              </span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalCircle01Icon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="max-h-96 min-w-72"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                Viewing as
                <span className="block text-xs font-normal text-muted-foreground">
                  Demo role switcher — no password sign-in
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={user.id}
              onValueChange={(id) =>
                startTransition(() => switchUser(String(id)))
              }
            >
              {users.map((u) => (
                <DropdownMenuRadioItem key={u.id} value={u.id}>
                  <span className="truncate">{u.name}</span>
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">
                    {u.role}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
