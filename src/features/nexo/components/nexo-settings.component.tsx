"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Sparkles } from "lucide-react";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { saveNexoSettingsAction } from "@/features/nexo/actions/nexo-settings.action";
import { SYNTHESIS_TASK } from "@/features/nexo/constants/nexo-task.constants";
import { NexoProfileEditor } from "@/features/nexo/components/nexo-profile-editor.component";
import type {
  NexoProfile,
  NexoSettingsConfig,
} from "@/features/nexo/schemas/nexo-settings.schema";

function newProfile(): NexoProfile {
  return {
    id: `profile-${crypto.randomUUID()}`,
    name: "Synthesis profile",
    provider: "openai",
    model: "",
    reasoning: "default",
    verbosity: "default",
    maxOutputTokens: 8000,
    timeoutSeconds: 90,
  };
}

export function NexoSettings({
  config,
  credentialAvailable,
  version,
}: {
  config: NexoSettingsConfig;
  credentialAvailable: boolean;
  version: number;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(config.profiles);
  const [assignedProfileId, setAssignedProfileId] = useState(
    config.assignments.find(({ taskId }) => taskId === SYNTHESIS_TASK)
      ?.profileId ?? "",
  );
  const [dailyRunLimit, setDailyRunLimit] = useState(config.dailyRunLimit);

  function removeProfile(profileId: string) {
    setProfiles((current) =>
      current.filter((profile) => profile.id !== profileId),
    );
    setAssignedProfileId((current) => (current === profileId ? "" : current));
  }

  return (
    <div className="nexo-settings">
      <header className="nexo-settings-heading settings-page-heading">
        <p className="eyebrow">Nexo</p>
        <h2>Configure requested synthesis.</h2>
        <p>
          Choose how requested synthesis runs. Every result remains a proposal
          until you accept it.
        </p>
      </header>

      <details
        className="nexo-credential-status"
        data-available={credentialAvailable || undefined}
      >
        <summary>
          <span>
            <KeyRound aria-hidden="true" />
          </span>
          <strong>
            {credentialAvailable
              ? "Server credential available"
              : "Server credential required"}
          </strong>
        </summary>
        <p>
          {credentialAvailable
            ? "Nexo can run an assigned profile. The credential never reaches this page."
            : "Add OPENAI_API_KEY on the server to enable requests. You can finish the profile now."}
        </p>
      </details>

      <RecordForm
        formClassName="nexo-settings-form"
        submitLabel="Save Nexo settings"
        action={async () =>
          saveNexoSettingsAction(version, {
            schemaVersion: 1,
            profiles,
            assignments: assignedProfileId
              ? [
                  {
                    taskId: SYNTHESIS_TASK,
                    profileId: assignedProfileId,
                  },
                ]
              : [],
            dailyRunLimit,
          })
        }
        onSaved={() => router.refresh()}
      >
        <section
          className="nexo-settings-section"
          aria-labelledby="nexo-profiles-title"
        >
          <header>
            <div>
              <p className="eyebrow">Model profiles</p>
              <h3 id="nexo-profiles-title">Provider configurations</h3>
              <p>Choose the model for requested summaries.</p>
            </div>
            <button
              type="button"
              className="finance-dialog-trigger finance-dialog-trigger--secondary"
              disabled={profiles.length >= 20}
              onClick={() =>
                setProfiles((current) => [...current, newProfile()])
              }
            >
              <Plus aria-hidden="true" /> Add profile
            </button>
          </header>

          {profiles.length > 0 ? (
            <div className="nexo-profile-list">
              {profiles.map((profile) => (
                <NexoProfileEditor
                  key={profile.id}
                  profile={profile}
                  onChange={(next) =>
                    setProfiles((current) =>
                      current.map((item) =>
                        item.id === next.id ? next : item,
                      ),
                    )
                  }
                  onRemove={() => removeProfile(profile.id)}
                />
              ))}
            </div>
          ) : (
            <div className="nexo-profile-empty">
              <Sparkles aria-hidden="true" />
              <div>
                <strong>No model profile configured</strong>
                <p>Add a profile when you want on-request synthesis.</p>
              </div>
              <button
                type="button"
                className="finance-dialog-trigger"
                onClick={() => setProfiles([newProfile()])}
              >
                Add first profile
              </button>
            </div>
          )}
        </section>

        <section
          className="nexo-settings-section"
          aria-labelledby="nexo-assignment-title"
        >
          <header>
            <div>
              <p className="eyebrow">Task assignment</p>
              <h3 id="nexo-assignment-title">So Far We Know summary</h3>
              <p>Choose which profile creates this proposal.</p>
            </div>
          </header>
          <label className="nexo-settings-field">
            Model profile
            <select
              value={assignedProfileId}
              disabled={profiles.length === 0}
              onChange={(event) => setAssignedProfileId(event.target.value)}
            >
              <option value="">No profile assigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name || "Untitled profile"}
                </option>
              ))}
            </select>
            <small>Manual understanding remains available either way.</small>
          </label>
        </section>

        <section
          className="nexo-settings-section"
          aria-labelledby="nexo-limits-title"
        >
          <header>
            <div>
              <p className="eyebrow">Operational limit</p>
              <h3 id="nexo-limits-title">Daily requested runs</h3>
              <p>Set a daily ceiling for requested runs.</p>
            </div>
          </header>
          <label className="nexo-settings-field">
            Maximum runs per day
            <input
              type="number"
              min={1}
              max={100}
              required
              value={dailyRunLimit}
              onChange={(event) => setDailyRunLimit(Number(event.target.value))}
            />
          </label>
        </section>
      </RecordForm>
    </div>
  );
}
