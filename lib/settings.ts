import {
  toPublicSettings,
  type AppSettings,
  type PublicSettings,
} from "@/lib/settings-model"
import { getData, mutate } from "@/lib/store"

// The only module that reads or writes settings; swap its internals for Postgres.
export async function getSettings(): Promise<AppSettings> {
  return (await getData()).settings
}

export async function getPublicSettings(): Promise<PublicSettings> {
  return toPublicSettings(await getSettings())
}

export async function updateSettings<T>(
  fn: (settings: AppSettings) => T
): Promise<T> {
  return mutate((data) => fn(data.settings))
}
