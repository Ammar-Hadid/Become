import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SeasonPreparationProgress } from "./season-preparation.component";

const progress = {
  attempt: "storybook-sample",
  startedAt: new Date().toISOString(),
  phase: "writing" as const,
  paragraphs: [
    "Sample draft: a quiet observatory, familiar paths and a horizon that opens further with each chapter.",
    "The world responds to your work through changing light and accessible paths. This is illustrative preview copy.",
  ],
  estimate: { minMs: 130000, maxMs: 255000, samples: 6 },
};
const meta = {
  title: "Season/Preparation Focus",
  component: SeasonPreparationProgress,
  parameters: { layout: "padded" },
  args: {
    name: "Levi Ackerman",
    sourceWork: "Attack on Titan · sample artwork and text",
    portraitHref: "/design-review/character-workspace-v3/levi-avatar.webp",
    status: "RUNNING",
    progress,
    paused: false,
    onPause: () => {},
    onResume: () => {},
    onLeave: () => {},
  },
} satisfies Meta<typeof SeasonPreparationProgress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ArrivingText: Story = {};
export const Research: Story = {
  args: { progress: { ...progress, phase: "research", paragraphs: [] } },
};
export const FinalChecks: Story = {
  args: { progress: { ...progress, phase: "checking" } },
};
export const Paused: Story = { args: { status: "PAUSED" } };
export const Interrupted: Story = {
  args: {
    status: "FAILED",
    error: "Sample interruption. Completed paragraphs remain available.",
  },
};
export const NoPortraitOrEstimate: Story = {
  args: { portraitHref: null, progress: { ...progress, estimate: null } },
};
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 390 }}>
        <Story />
      </div>
    ),
  ],
};
