import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../../buttons/button.component";
import { storybookDescription } from "../../metadata/utils/storybook-description.util";
import { useInterfaceSound } from "../hooks/use-interface-sound.hook";
import { InterfaceSoundProvider } from "./interface-sound-provider.component";

function SoundControls() {
  const { enabled, setEnabled, play } = useInterfaceSound();
  return (
    <div style={{ display: "grid", gap: 16, justifyItems: "start" }}>
      <Button onClick={() => play("controlConfirmed")}>Play Pulse Pin</Button>
      <Button variant="secondary" onClick={() => setEnabled(!enabled)}>
        Interface sounds: {enabled ? "on" : "off"}
      </Button>
      <p className="type-caption">
        Sound is supplemental. The first click unlocks browser audio; muting is
        saved by the shared provider.
      </p>
    </div>
  );
}

const meta = {
  title: "Feedback/Interface Sound",
  component: InterfaceSoundProvider,
  args: { children: null },
  parameters: {
    docs: {
      description: {
        component: storybookDescription("CharacterStepRailPulsePin"),
      },
    },
  },
  render: () => <SoundControls />,
} satisfies Meta<typeof InterfaceSoundProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PulsePin: Story = {};
