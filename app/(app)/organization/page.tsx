import { AppHeader } from "@/components/app-header"
import { PeoplePanel } from "@/components/organization/people-panel"
import { selectableRoles } from "@/lib/employees"
import { requireMD } from "@/lib/session"

export default async function OrganizationPage() {
  const { all } = await requireMD()

  const roles = selectableRoles(all.hierarchy)
  const byKey = new Map<string, string>()
  for (const employee of all.employees) {
    const key = employee.department.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, employee.department)
  }
  const departments = [...byKey.values()].sort()

  return (
    <>
      <AppHeader description="Add, edit and remove the people in your organization." />
      <PeoplePanel
        employees={all.employees}
        roles={roles}
        departments={departments}
      />
    </>
  )
}
