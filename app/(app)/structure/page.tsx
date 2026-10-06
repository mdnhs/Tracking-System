import { Building03Icon, Rocket01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/app-header"
import { Avatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"

export default async function StructurePage() {
  const { all: data } = await getSession()

  const levels = [...new Set(data.hierarchy.map((h) => h.level))].sort(
    (a, b) => a - b
  )

  return (
    <>
      <AppHeader description="The system follows your organization's own reporting structure." />

      <Card>
        <CardHeader>
          <CardTitle>Management Structure</CardTitle>
          <CardDescription>
            Reporting hierarchy and responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {levels.map((level, li) => {
              const roles = data.hierarchy.filter((h) => h.level === level)
              return (
                <div key={level} className="flex w-full flex-col items-center">
                  {li > 0 ? (
                    <div className="h-6 w-px bg-border" aria-hidden />
                  ) : null}
                  <div
                    className={cn(
                      "flex w-full flex-wrap justify-center gap-3",
                      roles.length === 1 ? "max-w-sm" : "max-w-4xl"
                    )}
                  >
                    {roles.map((role) => {
                      const people = data.employees.filter(
                        (e) => e.role === role.role
                      )
                      return (
                        <div
                          key={role.role}
                          className={cn(
                            "min-w-56 flex-1 rounded-xl border bg-card p-4 shadow-xs",
                            level === 1 && "border-primary/40 bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <HugeiconsIcon
                                icon={Building03Icon}
                                className="size-4"
                                strokeWidth={2}
                              />
                            </div>
                            <p className="font-heading text-sm font-semibold">
                              {role.role}
                            </p>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {role.responsibility}
                          </p>
                          {people.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                              {people.map((person) => (
                                <span
                                  key={person.id}
                                  className="flex items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5 text-xs"
                                >
                                  <Avatar
                                    name={person.name}
                                    seed={person.id}
                                    className="size-5 text-xs"
                                  />
                                  {person.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                              {level === 1
                                ? "Assigns work to any responsible person"
                                : "No one assigned to this role yet"}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Business Benefits</CardTitle>
          <CardDescription>
            What the system delivers for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="flex gap-3 rounded-xl border bg-muted/30 p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-heading text-base font-semibold text-primary">
                  {benefit.key}
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-sm font-semibold">
                    {benefit.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Rocket01Icon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
            />
            Future Scalability
          </CardTitle>
          <CardDescription>
            Start simple, grow when you are ready — future possibilities, not
            initial requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {data.futureScalability.map((item) => (
              <li key={item}>
                <Badge variant="outline" className="font-normal">
                  {item}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
