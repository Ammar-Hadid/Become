import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { EmptyState } from "./empty-state.component";

const meta = {
  title: "Feedback/Empty State",
  component: EmptyState,
  args: {
    pattern: "project-anatomy",
    area: "engineering",
    title: "No projects yet",
    description:
      "Create a project to connect your focused sessions and evidence.",
    action: <Button>New project</Button>,
  },
  argTypes: {
    pattern: {
      control: "select",
      options: [
        "project-anatomy",
        "account-gateway",
        "audience-constellation",
        "editorial-canvas",
        "goal-trajectory",
        "first-focus",
        "ledger-replacement",
        "unplotted-chart",
        "active-filter",
        "search-echo",
        "time-window-silence",
        "archive-quiet",
        "attention-resolved",
        "review-queue-clear",
        "publication-pause",
        "follow-up-complete",
      ],
    },
    size: { control: "select", options: ["default", "compact"] },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullPage: Story = {};
export const Compact: Story = {
  args: {
    size: "compact",
    pattern: "review-queue-clear",
    area: "dashboard",
    title: "All caught up",
    description: "No reviews are waiting for attention.",
    action: undefined,
  },
};
