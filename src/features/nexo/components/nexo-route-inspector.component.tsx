"use client";

import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { useId } from "react";
import { CircleAlert, CircleCheck, Route } from "lucide-react";
import type { NexoProfile } from "@/features/nexo/schemas/nexo-settings.schema";

type InspectedTask = {
  id: string;
  version: number;
  group: string;
  label: string;
  description: string;
};

function profileLabel(profile: NexoProfile) {
  return `${profile.name || "Untitled profile"} · ${
    profile.model || "Model ID required"
  }`;
}

export function NexoRouteInspector({
  task,
  profiles,
  profile,
  profileId,
  routeComplete,
  onProfileChange,
}: {
  task?: InspectedTask;
  profiles: NexoProfile[];
  profile?: NexoProfile;
  profileId: string;
  routeComplete: boolean;
  onProfileChange: (profileId: string) => void;
}) {
  const profileSelectId = useId();
  return (
    <aside
      id="nexo-route-inspector"
      className="nexo-route-inspector"
      aria-labelledby={task ? "nexo-route-inspector-title" : undefined}
    >
      {task ? (
        <>
          <header className="nexo-route-inspector-heading">
            <div>
              <p className="eyebrow">Selected task</p>
              <h4 id="nexo-route-inspector-title">{task.label}</h4>
            </div>
            <span data-ready={routeComplete || undefined}>
              {routeComplete ? (
                <CircleCheck aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              {routeComplete ? "Routed" : "Needs setup"}
            </span>
          </header>

          <p className="nexo-route-description">{task.description}</p>

          <label
            className="nexo-settings-field nexo-route-profile-field"
            htmlFor={profileSelectId}
          >
            Model profile
            <NativeSelect
              id={profileSelectId}
              value={profileId}
              disabled={profiles.length === 0}
              onChange={(event) => onProfileChange(event.target.value)}
            >
              <option value="">No profile assigned</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {profileLabel(item)}
                </option>
              ))}
            </NativeSelect>
            <small>
              {profiles.length === 0
                ? "Add a profile before assigning this task."
                : profile && !routeComplete
                  ? "Complete this profile before the task can run."
                  : "Click Save Nexo settings to apply profile and routing changes."}
            </small>
          </label>

          <WorkspaceDisclosure title="Connection details">
            <div className="nexo-route-path" aria-label="Execution path">
              <div>
                <span>Task</span>
                <strong>{task.group}</strong>
              </div>
              <div>
                <span>Profile</span>
                <strong>
                  {profile?.name ||
                    (profile ? "Untitled profile" : "Unassigned")}
                </strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>
                  {profile
                    ? {
                        openai: "OpenAI",
                        google: "Google Gemini",
                        zai: "Z.AI",
                        moonshot: "Kimi / Moonshot",
                      }[profile.provider]
                    : "Waiting"}
                </strong>
              </div>
            </div>

            <dl className="nexo-route-metadata">
              <div>
                <dt>Task key</dt>
                <dd>{task.id}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>Version {task.version}</dd>
              </div>
            </dl>
          </WorkspaceDisclosure>
        </>
      ) : (
        <div className="nexo-route-inspector-empty">
          <Route aria-hidden="true" />
          <strong>No task selected</strong>
          <p>Adjust the search or filter to choose a route.</p>
        </div>
      )}
    </aside>
  );
}
