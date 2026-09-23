"use client";

import { useState } from "react";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { BusinessSelect } from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  channels,
  directMessagePlatforms,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";

export const directMessagePlatformLabels: Record<
  (typeof directMessagePlatforms)[number],
  string
> = {
  WHATSAPP: "WhatsApp",
  REDDIT: "Reddit",
  DISCORD: "Discord",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  X: "X",
  OTHER: "Other",
};

export function ChannelPlatformFields({
  initialChannel = "OTHER",
  initialPlatform = "OTHER",
}: {
  initialChannel?: string;
  initialPlatform?: string;
}) {
  const [channel, setChannel] = useState(initialChannel);
  const [platform, setPlatform] = useState(initialPlatform);
  const platformPresence = usePresence(channel === "DM", "content");
  return (
    <>
      <BusinessSelect
        label="Channel"
        name="channel"
        value={channel}
        onChange={(event) => setChannel(event.target.value)}
      >
        {channels.map((option) => (
          <option value={option} key={option}>
            {humanize(option)}
          </option>
        ))}
      </BusinessSelect>
      {platformPresence.isPresent && (
        <div
          className="channel-platform-enter"
          data-presence={platformPresence.presenceState}
          aria-hidden={platformPresence.isExiting || undefined}
          inert={platformPresence.isExiting}
          onAnimationEnd={platformPresence.onPresenceAnimationEnd}
        >
          <BusinessSelect
            label="Platform"
            name="platform"
            value={platform}
            required={channel === "DM"}
            disabled={platformPresence.isExiting}
            onChange={(event) => setPlatform(event.target.value)}
          >
            {directMessagePlatforms.map((platform) => (
              <option value={platform} key={platform}>
                {directMessagePlatformLabels[platform]}
              </option>
            ))}
          </BusinessSelect>
        </div>
      )}
    </>
  );
}
