import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DesktopAreaNavigation } from "./desktop-area-navigation.component";

function NavigationDemo() {
  const [pathname, setPathname] = useState("/");
  return (
    <div style={{ minHeight: 520 }}>
      <DesktopAreaNavigation pathname={pathname} onNavigate={setPathname} />
      <p className="type-body" style={{ marginLeft: 96 }}>
        Selected route: {pathname}
      </p>
    </div>
  );
}

const meta = {
  title: "Navigation/Desktop Area Navigation",
  component: DesktopAreaNavigation,
  args: { pathname: "/", onNavigate: () => {} },
  render: () => <NavigationDemo />,
} satisfies Meta<typeof DesktopAreaNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Areas: Story = {};
