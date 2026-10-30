import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type FormEvent } from "react";
import { Button } from "../buttons/button.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import { Input } from "./input.component";

const meta = {
  title: "Forms/Input",
  component: Input,
  args: {
    label: "Character name",
    placeholder: "Enter a character name",
    variant: "body",
  },
  argTypes: { variant: { control: "radio", options: ["body", "featured"] } },
  parameters: {
    docs: { description: { component: storybookDescription("Input") } },
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
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = { args: { defaultValue: "Okabe Rintarou" } };
export const BodyEmpty: Story = {};
export const BodyFocused: Story = {
  args: { autoFocus: true, defaultValue: "Okabe Rintarou" },
};
export const BodyInvalid: Story = {
  args: { error: "A character name is required.", required: true },
};
export const BodyReadOnly: Story = {
  args: { readOnly: true, value: "TV anime" },
};
export const BodyDisabled: Story = {
  args: { disabled: true, defaultValue: "Levi Ackerman" },
};
export const Featured: Story = {
  args: { variant: "featured", defaultValue: "Okabe Rintarou" },
};
export const FeaturedEmpty: Story = { args: { variant: "featured" } };
export const FeaturedFocused: Story = {
  args: {
    variant: "featured",
    autoFocus: true,
    defaultValue: "Okabe Rintarou",
  },
};
export const FeaturedInvalid: Story = {
  args: {
    variant: "featured",
    error: "A character name is required.",
    required: true,
  },
};
export const FeaturedReadOnly: Story = {
  args: { variant: "featured", readOnly: true, value: "TV anime" },
};
export const FeaturedDisabled: Story = {
  args: { variant: "featured", disabled: true, defaultValue: "Levi Ackerman" },
};
export const NativeTypes: Story = {
  render: () => (
    <>
      <Input label="Email" type="email" placeholder="you@example.com" />
      <Input label="Source URL" type="url" placeholder="https://" />
      <Input
        label="API key"
        type="password"
        autoComplete="off"
        placeholder="Paste API key"
      />
      <Input
        label="Maximum output tokens"
        type="number"
        min={100}
        max={32000}
        step={1}
        defaultValue={8192}
      />
      <Input label="Search tasks" type="search" placeholder="Search tasks" />
    </>
  ),
};

function FormDemo({ variant }: { variant: "body" | "featured" }) {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Preview submitted locally; nothing was saved.");
  }
  return (
    <form
      onSubmit={submit}
      style={{ display: "grid", gap: "var(--space-action-field)" }}
    >
      <Input
        variant={variant}
        label="Character name"
        required
        defaultValue="Okabe Rintarou"
      />
      <Input
        variant={variant}
        label="Source work · optional"
        defaultValue="Steins;Gate"
      />
      <Button type="submit">Submit preview</Button>
      <p className="type-caption" role="status">
        {notice}
      </p>
    </form>
  );
}
export const BodyForm: Story = { render: () => <FormDemo variant="body" /> };
export const FeaturedForm: Story = {
  render: () => <FormDemo variant="featured" />,
};
