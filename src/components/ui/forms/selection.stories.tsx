import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Checkbox,
  Radio,
  SelectionCopy,
  SelectionLabel,
  Switch,
} from "./selection.component";

const meta = {
  title: "Forms/Selection",
  component: Checkbox,
  args: { defaultChecked: true },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CheckboxChoice: Story = {
  render: () => (
    <SelectionLabel>
      <Checkbox defaultChecked />
      <SelectionCopy help="Include the character's approved source material.">
        Use source references
      </SelectionCopy>
    </SelectionLabel>
  ),
};
export const RadioChoice: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <SelectionLabel>
        <Radio name="artwork" defaultChecked />
        <SelectionCopy>Generated image</SelectionCopy>
      </SelectionLabel>
      <SelectionLabel>
        <Radio name="artwork" />
        <SelectionCopy>Manual upload</SelectionCopy>
      </SelectionLabel>
    </div>
  ),
};
export const SoundSwitch: Story = {
  render: () => (
    <SelectionLabel>
      <Switch defaultChecked />
      <SelectionCopy help="Sounds are supplemental to visible state.">
        Interface sounds
      </SelectionCopy>
    </SelectionLabel>
  ),
};
