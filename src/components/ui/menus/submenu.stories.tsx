import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MenuItem } from "./menu-item.component";
import { SubMenu } from "./submenu.component";

const meta = {
  title: "Navigation/Submenu",
  component: SubMenu,
  args: {
    label: "Character actions",
    placement: "bottom-end",
    trigger: (props) => (
      <button {...props} className="become-button become-button--secondary">
        Character actions
      </button>
    ),
    children: (
      <>
        <MenuItem onSelect={() => {}}>Edit profile</MenuItem>
        <MenuItem onSelect={() => {}}>View sources</MenuItem>
        <MenuItem tone="danger" onSelect={() => {}}>
          Remove draft
        </MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof SubMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Actions: Story = {};
