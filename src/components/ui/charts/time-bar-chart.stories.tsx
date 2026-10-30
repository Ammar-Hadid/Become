import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TimeBarChart } from "./time-bar-chart.component";

const meta = {
  title: "Data/Time Bar Chart",
  component: TimeBarChart,
  args: {
    data: [
      { label: "Mon", seconds: 5400 },
      { label: "Tue", seconds: 7200 },
      { label: "Wed", seconds: 3600 },
      { label: "Thu", seconds: 9000 },
      { label: "Fri", seconds: 4500 },
      { label: "Sat", seconds: 0 },
      { label: "Sun", seconds: 6300 },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 620 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimeBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FocusedTime: Story = {};
