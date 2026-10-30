import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "../cards/card.component";
import { threadApprovedComponentMeta } from "./constants/thread-approved-component-meta.constants";

function ApprovedMetadata({ name }: { name: string }) {
  const entry = threadApprovedComponentMeta.find(
    (item) => item.component.name === name,
  );
  if (!entry) return null;

  return (
    <Card spacing="dense" material="solid" style={{ maxWidth: 900 }}>
      <p className="type-overline">THREAD-APPROVED SHARED TREATMENT</p>
      <h2 className="type-widget-title">{entry.component.name}</h2>
      <p className="type-body">{entry.component.description}</p>
      <p className="type-caption">{entry.component.path}</p>
      <pre
        className="type-system"
        style={{
          overflow: "auto",
          maxHeight: 560,
          marginTop: "var(--spacing-lg)",
          padding: "var(--spacing-md)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--field-radius)",
          background: "var(--color-surface-input)",
          color: "var(--color-text-secondary)",
        }}
      >
        {JSON.stringify(entry, null, 2)}
      </pre>
    </Card>
  );
}

const meta = {
  title: "Documentation/Approved Metadata",
  component: ApprovedMetadata,
  args: { name: "CharacterBanner" },
  argTypes: {
    name: {
      control: "select",
      options: threadApprovedComponentMeta.map((entry) => entry.component.name),
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Exact ComponentMeta records for the shared components, sound cue, and motion treatment explicitly approved in this thread. Sound and motion records describe nonvisual treatments rather than separate React components.",
      },
    },
  },
} satisfies Meta<typeof ApprovedMetadata>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inspect: Story = {};
export const Input: Story = { args: { name: "Input" } };
export const Textarea: Story = { args: { name: "Textarea" } };
export const AiTextFrame: Story = { args: { name: "AiTextFrame" } };

export const AiGeneratedText: Story = { args: { name: "AiGeneratedText" } };
export const AmbientLight: Story = { args: { name: "AmbientLight" } };
export const Button: Story = { args: { name: "Button" } };
export const ArtworkUpload: Story = { args: { name: "ArtworkUpload" } };

export const FeaturedCard: Story = { args: { name: "FeaturedCard" } };

export const StepIndicator: Story = { args: { name: "StepIndicator" } };
export const SeasonRitualLayout: Story = {
  args: { name: "SeasonRitualLayout" },
};

export const SeasonPreparation: Story = {
  args: { name: "SeasonPreparationProgress" },
};

export const Workspace: Story = { args: { name: "Workspace" } };
