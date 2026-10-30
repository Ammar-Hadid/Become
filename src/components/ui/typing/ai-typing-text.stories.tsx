import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import { AiTypingText } from "./ai-typing-text.component";

const description = storybookDescription("AiTypingText");

const meta = {
  title: "Character/AI Typing Text",
  component: AiTypingText,
  parameters: { docs: { description: { component: description } } },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 420,
          minHeight: 140,
          padding: 20,
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          background: "var(--color-surface)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    text: "You gather the facts, weigh the consequences, and choose what keeps people alive. Indecision gets people killed.",
    speaker: "Levi Ackerman",
  },
  argTypes: {
    speed: { control: { type: "range", min: 0.5, max: 3, step: 0.1 } },
  },
} satisfies Meta<typeof AiTypingText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CharacterResponse: Story = {};
export const DailyMessage: Story = {
  args: {
    speaker: "C.O.T.S",
    text: "Every day is another chance to grow. Take on what's ahead, give it your all, and surprise yourself.",
  },
};
export const ReducedOrComplete: Story = { args: { showFull: true } };
