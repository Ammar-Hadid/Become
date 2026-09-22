"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import type { NexoProfile } from "@/features/nexo/schemas/nexo-settings.schema";

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
  onChange,
  onRemove,
}: {
  profile: NexoProfile;
  onChange: (profile: NexoProfile) => void;
  onRemove: () => void;
}) {
  return (
    <article className="nexo-profile-editor">
      <header>
        <div>
          <span>OpenAI profile</span>
          <strong>{profile.name || "Untitled profile"}</strong>
        </div>
        <button
          type="button"
          className="nexo-profile-remove"
          aria-label={`Remove ${profile.name || "profile"}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Remove
        </button>
      </header>

      <div className="nexo-profile-fields">
        <label>
          Profile name
          <input
            type="text"
            required
            maxLength={80}
            value={profile.name}
            onChange={(event) =>
              onChange({ ...profile, name: event.target.value })
            }
          />
        </label>
        <label>
          Model ID
          <input
            type="text"
            required
            maxLength={120}
            value={profile.model}
            placeholder="Enter an available OpenAI model ID"
            onChange={(event) =>
              onChange({ ...profile, model: event.target.value })
            }
          />
          <small>Use a model enabled for the server’s OpenAI account.</small>
        </label>
      </div>

      <details className="nexo-profile-advanced">
        <summary>
          Advanced model controls
          <ChevronDown aria-hidden="true" />
        </summary>
        <div>
          <label>
            Reasoning effort
            <select
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
            </select>
          </label>
          <label>
            Response detail
            <select
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
            </select>
          </label>
          <label>
            Maximum output tokens
            <input
              type="number"
              min={1000}
              max={32000}
              step={1000}
              required
              value={profile.maxOutputTokens}
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
            <input
              type="number"
              min={15}
              max={180}
              required
              value={profile.timeoutSeconds}
              onChange={(event) =>
                onChange({
                  ...profile,
                  timeoutSeconds: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      </details>
    </article>
  );
}
