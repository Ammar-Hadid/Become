import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@/components/ui/cards/card.component";
import "./app-shell.css";

const meta = {
  title: "Layout/Page spacing",
  parameters: { layout: "fullscreen" },
  render: () => (
    <main className="app-shell-main">
      <div
        style={{
          width: "100%",
          paddingInline: "var(--space-page-edge)",
          paddingBlock: "var(--space-action-section)",
        }}
      >
        <Card material="glass" spacing="action">
          <h1 className="type-page-title">Non-dashboard page width</h1>
          <p className="type-body">
            Page content fills the width between equal side gutters. Desktop
            gutters follow the collapsed navigation launcher; phones use the
            approved mobile page edge. The dashboard keeps its own composition.
          </p>
        </Card>
      </div>
    </main>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const FullWidth: Story = {};
