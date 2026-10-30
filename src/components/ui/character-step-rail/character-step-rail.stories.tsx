import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import { CharacterStepRail } from "./character-step-rail.component";

const steps = [
  { id: "sources", label: "Source material", detail: "3 references" },
  { id: "speech", label: "Speech patterns", detail: "3 details" },
  { id: "phrases", label: "Signature phrases", detail: "0 details" },
  { id: "canon", label: "Canon references", detail: "3 details" },
  { id: "reactions", label: "Reactions", detail: "5 of 5 fields filled" },
] as const;

type StepId = (typeof steps)[number]["id"];
const description = [
  storybookDescription("CharacterStepRail"),
  storybookDescription("CharacterStepRailMotion"),
  storybookDescription("CharacterStepRailPulsePin"),
].join("\n\n");

function RailDemo({ initialStep = "sources" }: { initialStep?: StepId }) {
  const [selectedId, setSelectedId] = useState<StepId>(initialStep);
  return (
    <div style={{ maxWidth: 1280, marginInline: "auto" }}>
      <CharacterStepRail
        steps={steps}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <p className="type-body" style={{ paddingBlock: 24 }}>
        Active section: {steps.find((step) => step.id === selectedId)?.label}.
        Click or use arrow keys to hear Pulse Pin; wheel and touch gestures are
        silent.
      </p>
    </div>
  );
}

const meta = {
  title: "Character/Step Rail",
  component: CharacterStepRail,
  args: { steps, selectedId: "sources", onSelect: () => {} },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: description } },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  render: () => <RailDemo />,
} satisfies Meta<typeof CharacterStepRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};
export const ReactionsFirst: Story = {
  render: () => <RailDemo initialStep="reactions" />,
};
