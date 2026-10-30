import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Button } from "../buttons/button.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import { Textarea } from "./textarea.component";

const meta = {
  title: "Forms/Textarea",
  component: Textarea,
  args: {
    label: "Visual direction",
    variant: "body",
    size: "sm",
    placeholder: "Describe the feeling and appearance…",
  },
  argTypes: {
    variant: { control: "radio", options: ["body", "featured"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    rows: { control: { type: "number", min: 1 } },
  },
  parameters: {
    docs: { description: { component: storybookDescription("Textarea") } },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "grid",
          gap: "var(--space-action-field)",
          width: "100%",
          maxWidth: 760,
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

const sample =
  "Calm, cinematic, early morning light.\n\nA quiet mountain city with detailed streets and soft clouds. Keep the character recognizable as the world evolves.";
export const Body: Story = { args: { defaultValue: sample } };
export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: sample } };
export const BodyFocused: Story = {
  args: { autoFocus: true, defaultValue: sample },
};
export const BodyInvalid: Story = {
  args: {
    error: "Add a feeling, atmosphere or visual detail.",
    required: true,
  },
};
export const BodyReadOnly: Story = { args: { readOnly: true, value: sample } };
export const BodyDisabled: Story = {
  args: { disabled: true, defaultValue: sample },
};
export const Featured: Story = {
  args: { variant: "featured", defaultValue: sample },
};
export const FeaturedEmpty: Story = { args: { variant: "featured" } };
export const FeaturedFocused: Story = {
  args: { variant: "featured", autoFocus: true, defaultValue: sample },
};
export const FeaturedInvalid: Story = {
  args: {
    variant: "featured",
    error: "Describe the direction for your Season.",
    required: true,
  },
};
export const FeaturedReadOnly: Story = {
  args: { variant: "featured", readOnly: true, value: sample },
};
export const FeaturedDisabled: Story = {
  args: { variant: "featured", disabled: true, defaultValue: sample },
};
export const Sizes: Story = {
  render: () => (
    <>
      <Textarea
        label="Short note"
        size="sm"
        defaultValue="A concise observation."
      />
      <Textarea label="Longer note" size="md" defaultValue={sample} />
      <Textarea label="Extended writing" size="lg" defaultValue={sample} />
    </>
  ),
};
export const LongContent: Story = {
  args: {
    label: "Source notes",
    defaultValue: Array.from(
      { length: 24 },
      (_, index) =>
        `Observation ${index + 1}: preserve recognizable identity and the reviewed Season atmosphere.`,
    ).join("\n\n"),
    help: "The writing area grows to its shared height limit, then scrolls internally.",
  },
};

function ParagraphForm() {
  const [value, setValue] = useState(sample);
  const [notice, setNotice] = useState("");
  return (
    <form
      style={{ display: "grid", gap: "var(--space-action-field)" }}
      onSubmit={(event) => {
        event.preventDefault();
        setNotice("Preview accepted locally. No Season data changed.");
      }}
    >
      <Textarea
        label="How should it feel and look?"
        variant="featured"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        help="Enter adds a paragraph line; Tab moves to the next control."
      />
      <Button type="submit">Save preview</Button>
      <p className="type-caption" role="status">
        {notice}
      </p>
    </form>
  );
}
export const ParagraphsAndForm: Story = { render: () => <ParagraphForm /> };
