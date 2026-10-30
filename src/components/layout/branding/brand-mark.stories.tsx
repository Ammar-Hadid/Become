import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BrandMark } from "./brand-mark.component";

const meta = {
  title: "Navigation/Brand Mark",
  component: BrandMark,
  args: { compact: false },
  argTypes: { compact: { control: "boolean" } },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wordmark: Story = {};
export const Compact: Story = { args: { compact: true } };
