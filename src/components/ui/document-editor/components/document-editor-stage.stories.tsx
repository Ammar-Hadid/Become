import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentEditorStage } from "./document-editor-stage.component";

const meta = {
  title: "Writing/Document Editor Stage",
  component: DocumentEditorStage,
  args: {
    label: "Prompt body preview",
    children: (
      <div style={{ display: "grid", gap: 16 }}>
        <h2 className="type-widget-title">Character image direction</h2>
        <p className="type-body">
          Describe the character through the approved visual-intent brief. Keep
          identity, setting, and copy areas consistent across formats.
        </p>
        <p className="type-body">
          The owning feature supplies its editor toolbar, extensions, and save
          behavior.
        </p>
      </div>
    ),
  },
} satisfies Meta<typeof DocumentEditorStage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManuscriptSurface: Story = {};
