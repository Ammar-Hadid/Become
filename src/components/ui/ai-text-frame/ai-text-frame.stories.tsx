import { useId } from "react";
import { useArgs } from "storybook/preview-api";
import { Pause, Play } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { AiGeneratedText } from "../ai-generated-text/ai-generated-text.component";
import { AiTextFrame, type AiTextFrameProps } from "./ai-text-frame.component";

const summary = (
  <div
    className="type-body"
    style={{ display: "grid", gap: "var(--spacing-md)" }}
  >
    <p>
      Levi brings a quiet, exacting presence to this Season. His reserved manner
      suggests someone who notices details and takes responsibility seriously.
      Care should come through practical action rather than long speeches or
      constant reassurance. These are illustrative character notes; connected
      onboarding researches and cites the chosen adaptation.{" "}
      <a
        href="https://anilist.co/character/45627/Levi/"
        target="_blank"
        rel="noreferrer"
        aria-label="Preview reference: AniList character catalogue"
      >
        [1]
      </a>
    </p>
    <p>
      His voice uses short, direct sentences and concrete observations. Praise
      stays specific: what you did, what improved, and what deserves to
      continue. Dry humor can appear occasionally. Signature phrases are
      included only when their wording can be verified. This example contains no
      attributed quotation. Canon references connect responsibility and loyalty
      to the situation you actually recorded; missing evidence never implies
      success.
    </p>
    <p>
      During a setback, he names the difficulty plainly and suggests one useful
      next action. Recovery receives recognition for returning to the work.
      Visually, the Season places him in a quiet mountain city with early
      morning light. Recognizable hair, eyes, clothing and restrained expression
      stay consistent. Desktop and phone artwork are composed separately. You
      review the banners, profile picture and each chapter’s scenes before
      activation.
    </p>
  </div>
);

function FramePreview(_storyArgs: AiTextFrameProps, generated = false) {
  const [args, updateArgs] = useArgs<AiTextFrameProps>();
  const id = useId();
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "start",
        gap: "var(--spacing-lg)",
      }}
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
      <AiTextFrame {...args} id={id}>
        {generated ? (
          <GeneratedSummaryContent paused={args.paused} />
        ) : (
          args.children
        )}
      </AiTextFrame>
    </div>
  );
}

const meta = {
  title: "AI/Text Frame",
  component: AiTextFrame,
  render: (args) => FramePreview(args),
  args: {
    paused: false,
    children: summary,
    heading: "AI-prepared Season summary",
    description: "Levi Ackerman · Attack on Titan · TV anime",
  },
  argTypes: { paused: { control: "boolean" }, children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "Owner-approved primary-gold reading frame. Fits its text column, pauses outside the viewport or in hidden tabs, and stays static with reduced motion. Content and approval actions remain feature-owned; this glow does not indicate generation or verified accuracy.",
      },
    },
  },
} satisfies Meta<typeof AiTextFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

function GeneratedSummaryContent({ paused }: { paused?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--spacing-md)",
        whiteSpace: "pre-wrap",
      }}
    >
      <AiGeneratedText
        paused={paused}
        text={
          "Levi brings a quiet, exacting presence to this Season. His voice uses short, direct sentences and concrete observations. These are illustrative character notes. [1]\n\nThe Season places him in a quiet mountain city with early morning light. You review the banners, profile picture and each chapter’s scenes before activation."
        }
      />
      <p className="type-caption">
        Sources:{" "}
        <a
          href="https://anilist.co/character/45627/Levi/"
          target="_blank"
          rel="noreferrer"
          aria-label="Preview reference: AniList character catalogue"
        >
          [1]
        </a>
      </p>
    </div>
  );
}

export const SeasonSummary: Story = {};
export const WithGeneratedText: Story = {
  render: (args) => FramePreview(args, true),
};
export const AnotherCharacter: Story = {
  args: {
    description: "Motoko Kusanagi · Ghost in the Shell · 1995 film",
    paused: true,
    children: (
      <p className="type-body">
        Illustrative character brief for a different Season.
      </p>
    ),
  },
};
export const Paused: Story = { args: { paused: true } };
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "min(100%, 390px)" }}>
        <Story />
      </div>
    ),
  ],
};
export const ShortText: Story = {
  render: (args) => <AiTextFrame {...args} />,
  args: {
    paused: true,
    heading: undefined,
    description: undefined,
    children: <p className="type-body">A deliberate next attempt.</p>,
    "aria-label": "Short AI-prepared text",
  },
};
