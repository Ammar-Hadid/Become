import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressIndicator } from "./progress-indicator.component";

const meta = {
  title: "Feedback/Progress Indicator",
  component: ProgressIndicator,
  args: {
    value: 68,
    max: 100,
    label: "Season progress",
    variant: "segmented-halo",
    area: "direction",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["plasma-core", "season-ticks", "segmented-halo"],
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
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SegmentedHalo: Story = {};
export const PlasmaCore: Story = {
  args: { variant: "plasma-core", label: "Profile completeness" },
};
export const SeasonTicks: Story = {
  args: { variant: "season-ticks", label: "Elapsed Season time" },
};
export const Complete: Story = { args: { value: 100 } };
