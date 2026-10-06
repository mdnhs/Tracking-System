import { AiProvidersPanel } from "@/components/settings/ai-providers-panel"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import {
  SettingsTabs,
  type SettingsTab,
} from "@/components/settings/settings-tabs"
import { WorkflowSettingsForm } from "@/components/settings/workflow-settings-form"
import { AppHeader } from "@/components/app-header"
import { hasSettingsSecret } from "@/lib/crypto"
import { requireMD } from "@/lib/session"

const TABS: SettingsTab[] = ["general", "workflow", "ai"]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { data } = await requireMD()
  const { tab: requested } = await searchParams
  const tab = TABS.includes(requested as SettingsTab)
    ? (requested as SettingsTab)
    : "general"
  const { general, workflow, ai } = data.settings

  return (
    <>
      <AppHeader description="Company-wide configuration. Only the Managing Director can see this page." />
      <SettingsTabs
        tab={tab}
        general={<GeneralSettingsForm defaultValues={general} />}
        workflow={<WorkflowSettingsForm defaultValues={workflow} />}
        ai={
          <AiProvidersPanel
            settings={ai}
            secretConfigured={hasSettingsSecret()}
          />
        }
      />
    </>
  )
}
