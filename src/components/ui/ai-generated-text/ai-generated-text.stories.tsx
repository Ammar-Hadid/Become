import { useId, useState } from "react";
import { useArgs } from "storybook/preview-api";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { AiTextFrame } from "../ai-text-frame/ai-text-frame.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import {
  AiGeneratedText,
  type AiGeneratedTextProps,
} from "./ai-generated-text.component";

const summary =
  "Levi brings a quiet, exacting presence to this Season. His reserved manner suggests someone who notices details and takes responsibility seriously. Care should come through practical action rather than long speeches or constant reassurance. These are illustrative character notes; connected onboarding researches and cites the chosen adaptation. [1]\n\nHis voice uses short, direct sentences and concrete observations. Praise stays specific: what you did, what improved, and what deserves to continue. Dry humor can appear occasionally. Signature phrases are included only when their wording can be verified. This example contains no attributed quotation.\n\nCanon references connect responsibility and loyalty to the situation you actually recorded. Missing evidence never implies success. During a setback, he names the difficulty plainly and suggests one useful next action. Recovery receives recognition for returning to the work.\n\nVisually, the Season places him in a quiet mountain city with early morning light. Recognizable hair, eyes, clothing and restrained expression remain consistent. You review the banners, profile picture and each chapter’s scenes before activation.";

function RenderText() {
  const [args, updateArgs] = useArgs<AiGeneratedTextProps>();
  const [run, setRun] = useState(0);
  const id = useId();
  return (
    <div
      style={{ display: "grid", gap: "var(--spacing-lg)", maxWidth: "72ch" }}
    >
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}
      >
        <Button
          variant="secondary"
          aria-pressed={args.paused}
          aria-controls={id}
          onClick={() => updateArgs({ paused: !args.paused })}
        >
          {args.paused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
          {args.paused ? "Resume motion" : "Pause motion"}
        </Button>
        <Button
          variant="ghost"
          aria-controls={id}
          onClick={() => setRun((current) => current + 1)}
        >
          <RotateCcw aria-hidden="true" />
          Replay
        </Button>
      </div>
      <AiGeneratedText key={run} {...args} id={id} />
    </div>
  );
}
const meta = {
  title: "AI/Generated Text",
  component: AiGeneratedText,
  render: RenderText,
  args: { text: summary, paused: false, staticText: false },
  argTypes: {
    text: { control: "text" },
    paused: { control: "boolean" },
    staticText: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: { component: storybookDescription("AiGeneratedText") },
    },
  },
} satisfies Meta<typeof AiGeneratedText>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LongSummary: Story = {};
export const SingleParagraph: Story = {
  args: { text: summary.split("\n\n")[0] },
};
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "min(100%, 390px)" }}>
        <Story />
      </div>
    ),
  ],
};
export const Paused: Story = { args: { paused: true } };
export const StaticReading: Story = { args: { staticText: true } };
export const InReviewFrame: Story = {
  decorators: [
    (Story) => (
      <AiTextFrame
        paused
        heading="AI-prepared Season summary"
        description="Levi Ackerman · Attack on Titan · TV anime"
      >
        <Story />
        <p className="type-caption">
          Illustrative sample · no AI calls. Preview reference:{" "}
          <a
            href="https://anilist.co/character/45627/Levi/"
            target="_blank"
            rel="noreferrer"
          >
            [1]
          </a>
        </p>
      </AiTextFrame>
    ),
  ],
};
