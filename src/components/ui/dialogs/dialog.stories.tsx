import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { Dialog } from "./dialog.component";

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        eyebrow="SEASON"
        title="Review the character"
        description="Check the approved artwork and copy before activation."
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <p className="type-body">
          The dialog uses shared focus, Escape, and presence behavior.
        </p>
      </Dialog>
    </>
  );
}

const meta = {
  title: "Overlays/Dialog",
  component: Dialog,
  args: { open: false, onOpenChange: () => {}, title: "Review the character" },
  render: () => <DialogDemo />,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Review: Story = {};
