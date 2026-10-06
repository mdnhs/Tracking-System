import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { isManagement, MD_USER, scopeData } from "@/lib/permissions"
import { getData } from "@/lib/store"
import type { Employee, TrackingData } from "@/lib/types"

export const USER_COOKIE = "tracksys-user"

export function listUsers(data: TrackingData): Employee[] {
  return [MD_USER, ...data.employees]
}

export interface Session {
  user: Employee
  users: Employee[]
  data: TrackingData
  all: TrackingData
}

export async function getSession(): Promise<Session> {
  const all = await getData()
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
