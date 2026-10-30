import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { usePresence } from "../motion/hooks/use-presence.hook";
import { Drawer } from "./drawer.component";

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const presence = usePresence(open, "surface");
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      {presence.isPresent && (
        <Drawer
          open={open}
          presenceState={presence.presenceState}
          exiting={presence.isExiting}
          onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
          onClose={() => setOpen(false)}
          titleId="storybook-drawer-title"
          header={
            <h2 id="storybook-drawer-title" className="type-widget-title">
              Season details
            </h2>
          }
          footer={<Button onClick={() => setOpen(false)}>Close</Button>}
        >
          <p className="type-body">
            A shared layer for reviewing more detail without leaving the current
            page.
          </p>
        </Drawer>
      )}
    </>
  );
}

const meta = {
  title: "Overlays/Drawer",
  component: Drawer,
  args: {
    open: false,
    presenceState: "closed",
    exiting: false,
    onPresenceAnimationEnd: () => {},
    onClose: () => {},
    titleId: "storybook-drawer-title",
    header: "Season details",
    children: null,
  },
  render: () => <DrawerDemo />,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeasonDetails: Story = {};
