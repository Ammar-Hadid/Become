import { useId } from "react";
import { Pause, Play } from "lucide-react";
import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import {
  FeaturedCard,
  type FeaturedCardProps,
} from "./featured-card.component";

function Recap() {
  return (
    <>
      <h2 className="type-section-title">
        What you’re bringing into this Season
      </h2>
      <p className="type-body">
        An approved character, a world you shaped, and imagery reviewed by you.
      </p>
      <dl style={{ display: "grid", gap: "var(--spacing-xl)" }}>
        {[
          [
            "Character & voice",
            "Your reviewed profile, speech patterns and source references.",
          ],
          [
            "World & mood",
            "A quiet mountain city, with calm cinematic morning light.",
          ],
          [
            "Banners & portrait",
            "Desktop and phone banners, with a separately reviewed profile portrait.",
          ],
          [
            "Evolving scenes",
            "7 chapters · 3 pace states · 42 reviewed compositions.",
          ],
        ].map(([title, text]) => (
          <div
            key={title}
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "var(--spacing-lg)",
            }}
          >
            <dt className="type-widget-title">{title}</dt>
            <dd
              className="type-body-sm"
              style={{
                margin: "var(--spacing-sm) 0 0",
                color: "var(--color-text-secondary)",
              }}
            >
              {text}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

const meta = {
  title: "Surfaces/Featured Card",
  component: FeaturedCard,
  parameters: {
    docs: { description: { component: storybookDescription("FeaturedCard") } },
  },
  args: {
    facing: "left",
    paused: false,
    spacing: "action",
    as: "article",
    children: <Recap />,
  },
  argTypes: {
    facing: { control: "inline-radio", options: ["left", "right"] },
    paused: { control: "boolean" },
    children: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<FeaturedCardProps>();
    const id = useId();
    return (
      <div
        style={{
          maxWidth: 720,
          marginInline: "auto",
          padding: "24px 8px 56px",
          display: "grid",
          gap: "var(--spacing-2xl)",
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          aria-controls={id}
          aria-pressed={args.paused}
          style={{ justifySelf: "end" }}
          onClick={() => updateArgs({ paused: !args.paused })}
        >
          {args.paused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
          {args.paused ? "Resume motion" : "Pause motion"}
        </Button>
        <FeaturedCard {...args} id={id} />
      </div>
    );
  },
} satisfies Meta<typeof FeaturedCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FacingLeft: Story = { args: { facing: "left" } };
export const FacingRight: Story = { args: { facing: "right" } };
export const SeasonRecap: Story = {};
export const AiSummary: Story = {
  args: {
    children: (
      <>
        <h2 className="type-section-title">AI-prepared Season summary</h2>
        <p className="type-body">
          Your character will accompany you through a quiet mountain city.
          Recognizable landmarks connect all seven chapters while the light and
          staging develop with each pace state.
        </p>
        <p className="type-body">
          This is illustrative preview text. The feature supplies the real
          reviewed summary and owns its generation and approval.
        </p>
      </>
    ),
  },
};
export const Paused: Story = { args: { paused: true } };
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
