"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/cards/card.component";
import {
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { saveNexoSettingsAction } from "@/features/nexo/actions/nexo-settings.action";
import { ACTIVE_NEXO_TASKS } from "@/features/nexo/constants/nexo-task.constants";
import { NexoProfileEditor } from "@/features/nexo/components/nexo-profile-editor.component";
import { NexoTaskRouting } from "@/features/nexo/components/nexo-task-routing.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import type { AiProvider } from "@/features/nexo/services/ai-credential.service";
import {
  nexoProfileSchema,
  type NexoProfile,
  type NexoSettingsConfig,
} from "@/features/nexo/schemas/nexo-settings.schema";

function isCompleteProfile(profile: NexoProfile) {
  return nexoProfileSchema.safeParse(profile).success;
}

type NexoSettingsProps = {
  config: NexoSettingsConfig;
  credentialAvailable: boolean;
  credentialStatus: Record<
    AiProvider,
    { available: boolean; updatedAt: string | null }
  >;
  version: number;
};

function newProfile(): NexoProfile {
  return {
    id: `profile-${crypto.randomUUID()}`,
    name: "New AI profile",
    provider: "openai",
    model: "",
    reasoning: "default",
    verbosity: "default",
    maxOutputTokens: 8000,
    timeoutSeconds: 90,
  };
}

function initialAssignments(config: NexoSettingsConfig) {
  return Object.fromEntries(
    config.assignments.map(({ taskId, profileId }) => [taskId, profileId]),
  );
}

export function NexoSettings({
  config,
  credentialStatus: initialCredentialStatus,
  version,
}: NexoSettingsProps) {
  const router = useRouter();
  const { play } = useInterfaceSound();
  const [activeProvider, setActiveProvider] = useState<AiProvider>("openai");
  const [keyError, setKeyError] = useState(false);
  const [profiles, setProfiles] = useState(config.profiles);
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    initialAssignments(config),
  );
  const [dailyRunLimit, setDailyRunLimit] = useState(config.dailyRunLimit);
  const [credentialStatus, setCredentialStatus] = useState(
    initialCredentialStatus,
  );
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [keyMessage, setKeyMessage] = useState("");
  const [keyBusy, setKeyBusy] = useState<AiProvider | null>(null);
  const providers = ["openai", "zai", "moonshot", "google"] as const;
  const credentialAvailable = providers.some(
    (provider) => credentialStatus[provider].available,
  );
  const assignedProviders = ACTIVE_NEXO_TASKS.flatMap((task) => {
    const assigned = profiles.find(
      (profile) => profile.id === assignments[task.id],
    );
    return assigned ? [assigned.provider] : [];
  });
  const assignedCredentialsReady =
    assignedProviders.length > 0 &&
    assignedProviders.every((provider) => credentialStatus[provider].available);
  const completeProfileIds = new Set(
    profiles.filter(isCompleteProfile).map(({ id }) => id),
  );
  const assignedTaskCount = ACTIVE_NEXO_TASKS.filter((task) =>
    completeProfileIds.has(assignments[task.id] ?? ""),
  ).length;
  const setupReady =
    assignedCredentialsReady &&
    profiles.length > 0 &&
    assignedTaskCount === ACTIVE_NEXO_TASKS.length &&
    Number.isInteger(dailyRunLimit) &&
    dailyRunLimit >= 1 &&
    dailyRunLimit <= 100;
  const draftFingerprint = JSON.stringify({
    profiles,
    assignments: ACTIVE_NEXO_TASKS.flatMap((task) => {
      const profileId = assignments[task.id];
      return profileId ? [{ taskId: task.id, profileId }] : [];
    }),
    dailyRunLimit,
  });

  function removeProfile(profileId: string) {
    setProfiles((current) =>
      current.filter((profile) => profile.id !== profileId),
    );
    setAssignments((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, assignedId]) => {
          return assignedId !== profileId;
        }),
      ),
    );
  }

  async function saveKey(provider: AiProvider) {
    setKeyBusy(provider);
    setKeyMessage("");
    setKeyError(false);
    try {
      const response = await fetch("/api/settings/ai-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: keyDrafts[provider] ?? "" }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(result.error ?? "Could not save this key.");
      }
      play("saveConfirmed");
      setCredentialStatus(result.status);
      setKeyDrafts((prior) => ({ ...prior, [provider]: "" }));
      setKeyMessage(`${provider} key saved on the server.`);
    } catch (error) {
      setKeyError(true);
      setKeyMessage(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Could not confirm the key save. Your entry is preserved; try again."
          : error instanceof Error ? error.message : "Could not save this key.",
      );
    } finally {
      setKeyBusy(null);
    }
  }

  const providerNames: Record<AiProvider, string> = {
    openai: "OpenAI",
    zai: "Z.AI",
    moonshot: "Kimi / Moonshot",
    google: "Google Gemini",
  };
  return (
    <div className="nexo-settings nexo-workspace">
      <WorkspaceHeader
        eyebrow="Settings · Nexo"
        title="AI connections"
        description="Connect a provider, choose your models, then assign the tasks they handle."
      />
      <div className="nexo-setup-summary">
        <WorkspaceMetric
          label="Provider connection"
          value={credentialAvailable ? "Connected" : "Add a key"}
          detail={`${providers.filter((provider) => credentialStatus[provider].available).length} of ${providers.length} providers connected`}
        />
        <WorkspaceMetric
          label="Model profiles"
          value={completeProfileIds.size}
          detail={`${profiles.length} saved in this draft`}
        />
        <WorkspaceMetric
          label="Task assignments"
          value={`${assignedTaskCount} / ${ACTIVE_NEXO_TASKS.length}`}
          detail={
            setupReady
              ? "Draft complete · save to apply"
              : "Configure only the tasks you want to use"
          }
        />
      </div>
      <WorkspacePanel
        title="1. Connect a provider"
        description="API keys are stored encrypted. API usage is billed separately from a ChatGPT subscription."
        spacing="dense"
        className="nexo-provider-panel"
      >
        <div className="nexo-provider-layout">
          <div
            className="nexo-provider-statuses"
            aria-label="Provider connection status"
          >
            {providers.map((provider) => (
              <div key={provider}>
                <span>{providerNames[provider]}</span>
                <span
                  data-connected={
                    credentialStatus[provider].available || undefined
                  }
                >
                  {credentialStatus[provider].available ? (
                    <>
                      <CircleCheck /> Connected
                    </>
                  ) : (
                    "Not connected"
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="nexo-provider-entry">
            <label className="nexo-settings-field">
              <span>Provider connection</span>
              <NativeSelect
                value={activeProvider}
                onChange={(event) => {
                  setActiveProvider(event.target.value as AiProvider);
                  setKeyMessage("");
                  setKeyError(false);
                }}
              >
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerNames[provider]}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Input
              type="password"
              label={
                credentialStatus[activeProvider].available
                  ? "Replace API key"
                  : "API key"
              }
              aria-label={`${activeProvider} API key`}
              autoComplete="off"
              value={keyDrafts[activeProvider] ?? ""}
              onChange={(event) =>
                setKeyDrafts((prior) => ({
                  ...prior,
                  [activeProvider]: event.target.value,
                }))
              }
              placeholder="Paste the provider’s API key"
            />
            <Button
              type="button"
              disabled={
                keyBusy !== null || !(keyDrafts[activeProvider] ?? "").trim()
              }
              onClick={() => saveKey(activeProvider)}
            >
              {keyBusy === activeProvider ? "Saving…" : "Save key"}
            </Button>
            <p className="nexo-provider-help">
              Saved keys are never returned to this browser. Saving a key does
              not run AI.
            </p>
          </div>
        </div>
        {keyMessage && (
          <p
            className={keyError ? "form-error" : "type-body-sm"}
            role={keyError ? "alert" : "status"}
          >
            {keyMessage}
          </p>
        )}
      </WorkspacePanel>
      <RecordForm
        formClassName="nexo-settings-form"
        submitLabel="Save Nexo settings"
        action={async () =>
          saveNexoSettingsAction(version, {
            schemaVersion: 1,
            profiles,
            assignments: ACTIVE_NEXO_TASKS.flatMap((task) => {
              const profileId = assignments[task.id];
              return profileId ? [{ taskId: task.id, profileId }] : [];
            }),
            dailyRunLimit,
          })
        }
        onSaved={() => router.refresh()}
      >
        <input
          type="hidden"
          name="nexo-settings-draft"
          value={draftFingerprint}
        />
        <WorkspacePanel
          title="2. Choose your models"
          description="A profile saves a provider and model. Reuse it for as many tasks as you like."
          spacing="dense"
          actions={
            <div className="nexo-section-actions">
              <span>{profiles.length} / 20</span>
              <Button
                type="button"
                variant="secondary"
                disabled={profiles.length >= 20}
                onClick={() =>
                  setProfiles((current) => [...current, newProfile()])
                }
              >
                <Plus /> Add profile
              </Button>
            </div>
          }
        >
          {profiles.length ? (
            <div className="nexo-profile-list">
              {profiles.map((profile) => (
                <NexoProfileEditor
                  key={profile.id}
                  profile={profile}
                  assignedTaskCount={
                    ACTIVE_NEXO_TASKS.filter(
                      (task) => assignments[task.id] === profile.id,
                    ).length
                  }
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
                <p>Give your first model a name and enter its model ID.</p>
              </div>
              <Button type="button" onClick={() => setProfiles([newProfile()])}>
                Add first profile
              </Button>
            </div>
          )}
        </WorkspacePanel>
        <Card spacing="dense" className="nexo-routing-panel">
          <NexoTaskRouting
            tasks={ACTIVE_NEXO_TASKS}
            profiles={profiles}
            assignments={assignments}
            completeProfileIds={completeProfileIds}
            onAssignmentChange={(taskId, profileId) =>
              setAssignments((current) => ({ ...current, [taskId]: profileId }))
            }
          />
        </Card>
        <WorkspacePanel
          title="Daily usage limit"
          description="A shared ceiling across all active Nexo tasks and profiles."
          spacing="dense"
        >
          <div className="nexo-budget-row">
            <div>
              <strong>Maximum runs per day</strong>
              <p>
                Set a limit you are comfortable with. Token prices and model
                choices also affect the amount billed.
              </p>
            </div>
            <Input
              label="Daily limit"
              type="number"
              min={1}
              max={100}
              required
              value={dailyRunLimit}
              help="Choose a value from 1 to 100."
              onChange={(event) => setDailyRunLimit(Number(event.target.value))}
            />
          </div>
        </WorkspacePanel>
      </RecordForm>
    </div>
  );
}
