import { auth } from "@/lib/auth/auth";
import { getSettings } from "@/actions/settings/settings.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { SettingsForm } from "./settings-form";

const SETTINGS_KEYS = [
  { key: "smtp_host", label: "SMTP Host", superAdminOnly: false },
  { key: "smtp_user", label: "SMTP User", superAdminOnly: false },
  { key: "security_two_factor", label: "Require 2FA", superAdminOnly: true },
  { key: "workflow_auto_approve", label: "Auto-approve profiles", superAdminOnly: true },
];

export default async function SettingsPage() {
  const session = await auth();
  const settings = await getSettings();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const visibleKeys = SETTINGS_KEYS.filter((k) => isSuperAdmin || !k.superAdminOnly);

  return (
    <div className="space-y-6">
      <DashboardHero title="Settings" subtitle={isSuperAdmin ? "Full access" : "Limited access"} />
      <SettingsForm keys={visibleKeys} settings={settings} />
    </div>
  );
}