import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingIndicator } from "./loading-indicator.component";

const meta = {
  title: "Feedback/Loading Indicator",
  component: LoadingIndicator,
  args: {
    label: "Loading Season data",
    variant: "orbit-arc",
    area: "direction",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["orbit-arc", "edge-trace", "eclipse"],
    },
    area: {
      control: "select",
      options: [
        "dashboard",
        "engineering",
        "finance",
        "entrepreneurship",
        "content",
        "direction",
      ],
    },
  },
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrbitArc: Story = {};
export const EdgeTrace: Story = { args: { variant: "edge-trace" } };
export const Eclipse: Story = { args: { variant: "eclipse" } };
