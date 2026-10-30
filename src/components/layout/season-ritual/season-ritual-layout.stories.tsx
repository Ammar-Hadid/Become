import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pause, Play } from "lucide-react";
import { SeasonRitualLayout } from "./season-ritual-layout.component";
import { BrandMark } from "../branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import { StepIndicator } from "@/components/ui/step-indicator/step-indicator.component";
import { storybookDescription } from "@/components/ui/metadata/utils/storybook-description.util";
const meta = {
  title: "Layout/Season Ritual",
  component: SeasonRitualLayout,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: storybookDescription("SeasonRitualLayout") },
    },
  },
  args: {
    split: true,
    paused: false,
    contentKey: "character",
    header: null,
    introduction: (
      <>
        <span className="opening-step-numeral" aria-hidden="true">
          01
        </span>
        <div className="opening-intro-copy">
          <p className="type-overline">Illustrative Season</p>
          <h1 id="opening-step-title" className="type-season-entry-title">
            Who will inspire this <em>Season</em>?
          </h1>
          <p className="type-body-lg">
            Confirm your character before shaping the world.
          </p>
        </div>
        <p className="opening-intro-signoff">
          Same you.
          <br />A higher version.
        </p>
      </>
    ),
    footer: (
      <span className="type-caption">
        Presentation example · no saving or AI calls
      </span>
    ),
    children: (
      <div style={{ display: "grid", gap: "var(--spacing-3xl)" }}>
        <StepIndicator
          label="Character preparation"
          items={[
            { id: "character", label: "Character", state: "current" },
            { id: "confirm", label: "Confirm", state: "upcoming" },
            { id: "world", label: "World & mood", state: "upcoming" },
            { id: "summary", label: "Summary", state: "upcoming" },
          ]}
        />
        <Input
          label="Character name"
          variant="featured"
          placeholder="Your character"
        />
        <Input label="Source work · optional" variant="featured" />
        <Button style={{ justifySelf: "start" }}>Find my character</Button>
      </div>
    ),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <SeasonRitualLayout
        {...args}
        header={
          <>
            <div className="opening-layout-brand">
              <BrandMark />
              <span className="type-system">A higher version of you</span>
            </div>
            <StepIndicator
              variant="phase"
              label="Season phases"
              items={[
                { id: "character", label: "Character", state: "current" },
                { id: "imagery", label: "Imagery", state: "upcoming" },
                { id: "activate", label: "Activate Season", state: "upcoming" },
              ]}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={args.paused}
              aria-controls="opening-layout-content"
              onClick={() => updateArgs({ paused: !args.paused })}
            >
              {args.paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {args.paused ? "Resume motion" : "Pause motion"}
            </Button>
          </>
        }
      />
    );
  },
} satisfies Meta<typeof SeasonRitualLayout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Preparation: Story = {};
export const FullWidth: Story = { args: { split: false } };
export const Paused: Story = { args: { paused: true } };
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
