import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Compass } from "lucide-react";
import { AreaIcon } from "./area-icon.component";
import { IconFrame } from "./icon-frame.component";

const meta = {
  title: "Foundation/Icon Frame",
  component: IconFrame,
  args: { treatment: "compact", area: "direction", children: <Compass /> },
  argTypes: {
    treatment: { control: "select", options: ["bare", "compact", "featured"] },
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
} satisfies Meta<typeof IconFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {};
export const Featured: Story = { args: { treatment: "featured" } };
export const Bare: Story = { args: { treatment: "bare" } };
export const AreaIdentities: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      {(
        [
          "dashboard",
          "engineering",
          "finance",
          "entrepreneurship",
          "content",
          "direction",
        ] as const
      ).map((area) => (
        <div
          key={area}
          style={{ display: "grid", gap: 8, justifyItems: "center" }}
        >
          <AreaIcon area={area} treatment="featured" />
          <span className="type-caption">{area}</span>
        </div>
      ))}
    </div>
  ),
};
