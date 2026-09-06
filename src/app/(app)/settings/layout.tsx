import { SettingsShell } from "@/features/settings/components/settings-shell.component";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
