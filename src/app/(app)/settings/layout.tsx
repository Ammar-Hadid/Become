import { SettingsShell } from "@/features/settings/components/settings-shell.component";
import "@/features/nexo/styles/nexo-settings.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
