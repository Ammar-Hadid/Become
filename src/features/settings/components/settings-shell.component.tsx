import { ViewTransition } from "react";
import { SettingsNavigation } from "@/features/settings/components/settings-navigation.component";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell settings-shell">
      <header className="settings-shell-heading">
        <h1>Settings</h1>
      </header>

      <div className="settings-shell-layout">
        <SettingsNavigation />
        <ViewTransition
          name="settings-content"
          share="motion-data-recompose"
          default="none"
        >
          <div className="settings-content">{children}</div>
        </ViewTransition>
      </div>
    </div>
  );
}
