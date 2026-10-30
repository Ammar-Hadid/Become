"use client";

import { Button } from "@/components/ui/buttons/button.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { Input } from "@/components/ui/forms/input.component";

import { type InvalidEvent, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import type { NexoProfile } from "@/features/nexo/schemas/nexo-settings.schema";
import { Select } from "@/components/ui/forms/select.component";

const reasoningOptions: Array<{
  value: NexoProfile["reasoning"];
  label: string;
}> = [
  { value: "default", label: "Provider default" },
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
];

const verbosityOptions: Array<{
  value: NexoProfile["verbosity"];
  label: string;
}> = [
  { value: "default", label: "Provider default" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function NexoProfileEditor({
  profile,
  assignedTaskCount,
  onChange,
  onRemove,
}: {
  profile: NexoProfile;
  assignedTaskCount: number;
  onChange: (profile: NexoProfile) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!profile.model);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const profileName = profile.name || "Untitled profile";
  const assignmentLabel = `${assignedTaskCount} ${
    assignedTaskCount === 1 ? "task" : "tasks"
  }`;

  function revealInvalidControl(
    event: InvalidEvent<HTMLInputElement>,
    advanced = false,
  ) {
    const profileEditor = event.currentTarget.closest<HTMLDetailsElement>(
      ".nexo-profile-editor",
    );
    if (profileEditor) profileEditor.open = true;
    setOpen(true);

    if (!advanced) return;
    const advancedEditor = event.currentTarget.closest<HTMLDetailsElement>(
      ".nexo-profile-advanced",
    );
    if (advancedEditor) advancedEditor.open = true;
    setAdvancedOpen(true);
  }

  return (
    <details
      className="nexo-profile-editor"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="nexo-profile-provider" aria-hidden="true">
          {profile.provider.slice(0, 2).toUpperCase()}
        </span>
        <span className="nexo-profile-identity">
          <strong>{profileName}</strong>
          <span>{profile.model || "Model ID required"}</span>
        </span>
        <span className="nexo-profile-assignment-count">{assignmentLabel}</span>
        <ChevronDown className="nexo-profile-chevron" aria-hidden="true" />
      </summary>

      <div className="nexo-profile-editor-body">
        <div className="nexo-profile-fields">
          <div className="nexo-profile-field">
            <span>Provider</span>
            <Select
              label="Provider"
              value={profile.provider}
              options={[
                { value: "openai", label: "OpenAI" },
                { value: "zai", label: "Z.AI" },
                { value: "moonshot", label: "Kimi / Moonshot" },
                { value: "google", label: "Google Gemini" },
              ]}
              onValueChange={(provider) => onChange({ ...profile, provider })}
            />
          </div>
          <label>
            Profile name
            <Input
              type="text"
              required
              maxLength={80}
              value={profile.name}
              onInvalid={revealInvalidControl}
              onChange={(event) =>
                onChange({ ...profile, name: event.target.value })
              }
            />
          </label>
          <label>
            Model ID
            <Input
              type="text"
              required
              maxLength={120}
              value={profile.model}
              placeholder="Enter an available model ID"
              onInvalid={revealInvalidControl}
              onChange={(event) =>
                onChange({ ...profile, model: event.target.value })
              }
            />
            <small>Use a model enabled for this provider key.</small>
          </label>
        </div>

        <details
          className="nexo-profile-advanced"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary>
            Advanced model controls
            <ChevronDown aria-hidden="true" />
          </summary>
          <div>
            <label>
              Reasoning effort
              <NativeSelect
                value={profile.reasoning}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    reasoning: event.target.value as NexoProfile["reasoning"],
                  })
                }
              >
                {reasoningOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label>
              Response detail
              <NativeSelect
                value={profile.verbosity}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    verbosity: event.target.value as NexoProfile["verbosity"],
                  })
                }
              >
                {verbosityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label>
              Maximum output tokens
              <Input
                type="number"
                min={100}
                max={32000}
                step={1}
                required
                value={profile.maxOutputTokens}
                onInvalid={(event) => revealInvalidControl(event, true)}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    maxOutputTokens: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Timeout in seconds
              <Input
                type="number"
                min={15}
                max={180}
                required
                value={profile.timeoutSeconds}
                onInvalid={(event) => revealInvalidControl(event, true)}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    timeoutSeconds: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Input price (USD / million tokens)
              <Input
                type="number"
                min={0}
                max={1000}
                step="0.001"
                value={profile.inputUsdPerMillion ?? ""}
                onInvalid={(event) => revealInvalidControl(event, true)}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    inputUsdPerMillion: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
            </label>
            <label>
              Output price (USD / million tokens)
              <Input
                type="number"
                min={0}
                max={1000}
                step="0.001"
                value={profile.outputUsdPerMillion ?? ""}
                onInvalid={(event) => revealInvalidControl(event, true)}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    outputUsdPerMillion: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
              <small>
                Optional. Enter the provider’s current rates to estimate each
                run’s cost.
              </small>
            </label>
          </div>
        </details>

        <footer className="nexo-profile-actions">
          <span>{profile.provider} profile</span>
          <Button
            type="button"
            variant="ghost"
            className="nexo-profile-remove"
            aria-label={`Remove ${profileName}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
            Remove profile
          </Button>
        </footer>
      </div>
    </details>
  );
}
