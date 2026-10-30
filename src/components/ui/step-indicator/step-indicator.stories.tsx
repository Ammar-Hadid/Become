import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepIndicator } from "./step-indicator.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
const meta = {
  title: "Navigation/Step Indicator",
  component: StepIndicator,
  parameters: {
    docs: { description: { component: storybookDescription("StepIndicator") } },
  },
  args: {
    label: "Character preparation",
    variant: "numbered",
    items: [
      { id: "character", label: "Character", state: "complete" },
      { id: "confirm", label: "Confirm", state: "complete" },
      { id: "world", label: "World & mood", state: "current" },
      { id: "summary", label: "Summary", state: "upcoming" },
    ],
  },
} satisfies Meta<typeof StepIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Numbered: Story = {};
export const Phases: Story = {
  args: {
    variant: "phase",
    label: "Season phases",
    items: [
      { id: "character", label: "Character", state: "complete" },
      { id: "imagery", label: "Imagery", state: "current" },
      { id: "activation", label: "Activate Season", state: "upcoming" },
    ],
  },
};
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
