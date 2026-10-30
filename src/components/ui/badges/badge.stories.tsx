import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, RemovableBadge } from "./badge.component";

function RemovableDemo() {
  const [visible, setVisible] = useState(true);
  return visible ? (
    <RemovableBadge
      label="Character"
      area="direction"
      onRemove={() => setVisible(false)}
    />
  ) : (
    <p className="type-caption">Filter removed.</p>
  );
}

const meta = {
  title: "Foundation/Badge",
  component: Badge,
  args: {
    variant: "aurora-fill",
    area: "direction",
    children: "ACTIVE SEASON",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["aurora-fill", "live-numeral", "specimen-strip"],
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
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuroraFill: Story = {};
export const LiveNumeral: Story = {
  args: { variant: "live-numeral", children: "3" },
};
export const SpecimenStrip: Story = {
  args: { variant: "specimen-strip", children: "DRAFT" },
};
export const Removable: Story = {
  render: () => <RemovableDemo />,
};
