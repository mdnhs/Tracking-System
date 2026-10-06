import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getSession } from "@/lib/session"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, users, all } = await getSession()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={user}
        users={users}
        companyName={all.settings.general.companyName}
      />
      <SidebarInset className="h-svh overflow-y-auto md:h-[calc(100svh-1rem)] print:h-auto print:overflow-visible">
        <SiteHeader isMd={user.role === "MD"} />
        <div className="@container/main flex flex-auto shrink-0 flex-col gap-4 overflow-hidden p-4 md:gap-6 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
