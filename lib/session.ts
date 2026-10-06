import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { isManagement, MD_USER, scopeData } from "@/lib/permissions"
import { getData } from "@/lib/store"
import { toPublicSettings } from "@/lib/settings-model"
import type { Employee, PublicTrackingData, TrackingData } from "@/lib/types"

export const USER_COOKIE = "tracksys-user"

export function listUsers(data: Pick<TrackingData, "employees">): Employee[] {
  return [MD_USER, ...data.employees]
}

export interface Session {
  user: Employee
  users: Employee[]
  data: PublicTrackingData
  all: PublicTrackingData
}

export async function getSession(): Promise<Session> {
  const raw = await getData()
  const all: PublicTrackingData = {
    ...raw,
    settings: toPublicSettings(raw.settings),
  }
  const users = listUsers(all)
  const id = (await cookies()).get(USER_COOKIE)?.value
  const user = users.find((u) => u.id === id) ?? MD_USER
  return { user, users, data: scopeData(all, user), all }
}

export async function requireManagement(): Promise<Session> {
  const session = await getSession()
  if (!isManagement(session.user)) redirect("/employee")
  return session
}

export async function requireMD(): Promise<Session> {
  const session = await getSession()
  if (session.user.role !== "MD") {
    redirect(isManagement(session.user) ? "/dashboard" : "/employee")
  }
  return session
}
