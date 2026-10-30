import { useId } from "react";
import { useArgs } from "storybook/preview-api";
import { Pause, Play } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import {
  AmbientLight,
  type AmbientLightProps,
} from "./ambient-light.component";

function Preview({
  args,
  onPauseChange,
}: {
  args: AmbientLightProps;
  onPauseChange: (paused: boolean) => void;
}) {
  const id = useId();
  return (
    <AmbientLight
      {...args}
      id={id}
      style={{
        minHeight: "100dvh",
        padding: "var(--space-page-edge)",
        display: "grid",
        alignContent: "start",
        gap: "var(--space-action-section)",
        ...args.style,
      }}
    >
      <Button
        variant="ghost"
        aria-pressed={args.paused}
        aria-controls={id}
        style={{ justifySelf: "end" }}
        onClick={() => onPauseChange(!args.paused)}
      >
        {args.paused ? (
          <Play aria-hidden="true" />
        ) : (
          <Pause aria-hidden="true" />
        )}
        {args.paused ? "Resume motion" : "Pause motion"}
      </Button>
      {args.children}
    </AmbientLight>
  );
}

function Copy({ title, description }: { title: string; description: string }) {
  return (
    <section
      style={{ display: "grid", gap: "var(--spacing-lg)", maxWidth: "65ch" }}
    >
      <h1 className="type-page-title">{title}</h1>
      <p className="type-body" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
    </section>
  );
}

const meta = {
  title: "Surfaces/Ambient Light",
  component: AmbientLight,
  render: function Render(args) {
    const [, updateArgs] = useArgs<AmbientLightProps>();
    return (
      <Preview args={args} onPauseChange={(paused) => updateArgs({ paused })} />
    );
  },
  args: {
    paused: false,
    children: (
      <Copy
        title="Who will inspire this Season?"
        description="Gold Drift is the quiet backdrop throughout Character, Imagery and Activate Season. This motion is decorative; content and actions remain available immediately."
      />
    ),
  },
  argTypes: { paused: { control: "boolean" }, children: { control: false } },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, height: 560 },
      description: {
        component:
          "Owner-approved Gold Drift: two soft gold fields travel across the viewport on offset 16-second and 22.4-second cycles. Provide one shared pause control across the journey. Pauses out of view and in hidden tabs; reduced motion uses a static backdrop. Use one instance per page, never as a loading or progress indicator.",
      },
    },
  },
} satisfies Meta<typeof AmbientLight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Animated: Story = {};
export const Paused: Story = { args: { paused: true } };
export const Phone: Story = {
  args: {
    style: {
      maxWidth: 390,
      marginInline: "auto",
      padding: "var(--space-page-edge-mobile)",
    },
  },
};
export const Imagery: Story = {
  args: {
    children: (
      <Copy
        title="Your character, brought into this Season."
        description="The same Gold Drift continues while you review desktop and phone banners, your portrait and each chapter’s scenes. Artwork review and approval remain feature-owned."
      />
    ),
  },
};
export const Activation: Story = {
  args: {
    children: (
      <Copy
        title="Your Season is ready."
        description="The backdrop continues through the explicit activation checkpoint. Ambient motion never confirms activation or changes a saved record."
      />
    ),
  },
};
