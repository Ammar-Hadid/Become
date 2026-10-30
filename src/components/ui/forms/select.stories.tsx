import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FieldLabel } from "./field.component";
import { Select } from "./select.component";

const options = [
  { value: "reference", label: "Character reference sheet" },
  { value: "banner", label: "Character banner" },
  { value: "portrait", label: "Profile portrait" },
];

function SelectDemo() {
  const [value, setValue] = useState("reference");
  return (
    <div style={{ display: "grid", gap: 8, width: 320 }}>
      <FieldLabel>Imagery type</FieldLabel>
      <Select
        label="Imagery type"
        value={value}
        options={options}
        onValueChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: "Forms/Select",
  component: Select,
  args: {
    label: "Imagery type",
    value: "reference",
    options,
    onValueChange: () => {},
  },
  render: () => <SelectDemo />,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageryType: Story = {};
