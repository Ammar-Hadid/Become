"use client";

import { Volume2, VolumeX } from "lucide-react";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import {
  SelectionCopy,
  SelectionLabel,
  Switch,
} from "@/components/ui/forms/selection.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";

export function ApplicationSettings() {
  const { enabled, setEnabled } = useInterfaceSound();
  return (
    <div className="application-settings">
      <WorkspaceHeader
        eyebrow="Settings"
        title="Application preferences"
        description="Choose how Become responds as you use it."
      />
      <WorkspacePanel
        title="Sound"
        description="Quiet feedback for navigation, focus and confirmed actions."
        spacing="dense"
      >
        <SelectionLabel className="application-settings-sound-row">
          <IconFrame treatment="compact" area="dashboard">
            {enabled ? <Volume2 /> : <VolumeX />}
          </IconFrame>
          <SelectionCopy help="This preference is saved on this device.">
            Interface sounds
          </SelectionCopy>
          <span
            className="application-settings-sound-state type-system"
            aria-hidden="true"
          >
            {enabled ? "ON" : "OFF"}
          </span>
          <Switch
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </SelectionLabel>
      </WorkspacePanel>
    </div>
  );
}
