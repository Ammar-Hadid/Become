import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { Tooltip } from "./tooltip.component";

const meta = {
  title: "Feedback/Tooltip",
  component: Tooltip,
  args: {
    content:
      "Save your current edits as a draft. Published imagery stays unchanged.",
    area: "direction",
    side: "top",
    children: <Button variant="secondary">Save draft</Button>,
  },
  argTypes: {
    side: { control: "select", options: ["top", "bottom", "left", "right"] },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "grid", minHeight: 240, placeItems: "center" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HoverOrFocus: Story = {};
