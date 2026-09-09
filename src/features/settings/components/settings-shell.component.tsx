import Link from "next/link";
import { Landmark } from "lucide-react";
import { ViewTransition } from "react";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell settings-shell">
      <header className="settings-shell-heading">
        <h1>Settings</h1>
      </header>

      <div className="settings-shell-layout">
        <nav aria-label="Settings sections" className="settings-navigation">
          <p>Areas</p>
          <Link
            href="/settings/finance"
            aria-current="location"
            className="settings-navigation-link"
          >
            <Landmark aria-hidden="true" />
            <span>
              <strong>Finance</strong>
            </span>
          </Link>
        </nav>
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
