import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button.component";
import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";

const meta = {
  title: "Foundation/Button",
  component: Button,
  args: { children: "Continue", variant: "primary", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
    feedback: {
      control: false,
      description:
        "Controlled idle/pending/success feedback for the primary button. Caller confirms the operation and owns timing.",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = {
  args: { variant: "secondary", children: "Back" },
};
export const Ghost: Story = {
  args: { variant: "ghost", children: "More options" },
};
export const Danger: Story = {
  args: { variant: "danger", children: "Delete draft" },
};
export const Disabled: Story = {
  args: { disabled: true, children: "Unavailable" },
};

export const Success: Story = {
  args: {
    feedback: {
      state: "success",
      label: "Copy prompt",
      pendingLabel: "Copying…",
      successLabel: "Copied",
      icon: <Copy />,
    },
  },
};
export const PendingFeedback: Story = {
  args: {
    feedback: {
      state: "pending",
      label: "Copy prompt",
      pendingLabel: "Copying…",
      successLabel: "Copied",
      icon: <Copy />,
    },
    "aria-disabled": true,
  },
};

function CopyFeedbackDemo() {
  const [state, setState] = useState<"idle" | "success">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--spacing-lg)",
        justifyItems: "start",
      }}
    >
      <Button
        feedback={{
          state,
          label: "Copy prompt",
          pendingLabel: "Copying…",
          successLabel: "Copied",
          icon: <Copy />,
        }}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setState("success");
          timer.current = setTimeout(() => setState("idle"), 2000);
        }}
      />
      <p className="type-caption" role="status" aria-live="polite">
        {state === "success"
          ? "Simulated confirmed result."
          : "Click to demonstrate confirmation. This story does not access the clipboard."}
      </p>
    </div>
  );
}
export const CopyFeedback: Story = { render: () => <CopyFeedbackDemo /> };
