import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "./card.component";

const meta = {
  title: "Foundation/Card",
  component: Card,
  args: {
    material: "glass",
    spacing: "overview",
    children: (
      <>
        <p className="type-overline">SEASON DIRECTION</p>
        <h2 className="type-widget-title">A grounded character</h2>
        <p className="type-body">
          The same surface adapts to overview, dense, and action contexts.
        </p>
      </>
    ),
  },
  argTypes: {
    material: {
      control: "select",
      options: ["solid", "glass", "elevated-glass"],
    },
    spacing: { control: "select", options: ["overview", "dense", "action"] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {};
export const Solid: Story = { args: { material: "solid" } };
export const ElevatedGlass: Story = { args: { material: "elevated-glass" } };
export const Dense: Story = { args: { spacing: "dense" } };
