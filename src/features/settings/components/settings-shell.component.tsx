import Link from "next/link";
import { Landmark } from "lucide-react";

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
              <small>Money and category preferences</small>
            </span>
          </Link>
        </nav>
        <div className="settings-content">{children}</div>
      </div>
    </div>
  );
}
