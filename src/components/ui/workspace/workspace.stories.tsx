import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowDownLeft, ArrowRight, Plus, Save } from "lucide-react";
import {
  Workspace,
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspacePanel,
  WorkspaceLink,
} from "./workspace.component";
import { WorkspaceDisclosure } from "./workspace-disclosure.component";
import { WorkspaceNavigation } from "./workspace-navigation.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";

const meta = {
  title: "Workspaces/Composition & buttons",
  component: Workspace,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true, navigation: { pathname: "/finance" } },
  },
  args: { area: "finance" },
} satisfies Meta<typeof Workspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: (args) => (
    <Workspace {...args}>
      <WorkspaceNavigation
        label="Finance views"
        items={[
          { href: "/finance", label: "Overview", exact: true },
          { href: "/finance/transactions", label: "Transactions" },
          { href: "/finance/savings", label: "Savings" },
        ]}
      />
      <WorkspaceHeader
        eyebrow="Finance"
        title="A clear view of your money"
        description="Storybook sample data. The product uses your saved records."
        actions={
          <Button>
            <Plus />
            Add transaction
          </Button>
        }
      />
      <div className="workspace-stack">
        <div className="workspace-metrics">
          <WorkspaceMetric
            label="Income"
            value="€2,400.00"
            detail="This month · sample"
            icon={<ArrowDownLeft />}
            tone="positive"
          />
          <WorkspaceMetric
            label="Spending"
            value="€812.60"
            detail="This month · sample"
          />
        </div>
        <WorkspacePanel
          title="Recent activity"
          actions={
            <WorkspaceLink href="/finance/transactions" variant="ghost">
              View all
              <ArrowRight />
            </WorkspaceLink>
          }
        >
          <p>
            Use a quiet divided list for records; keep the surface around the
            collection.
          </p>
        </WorkspacePanel>
      </div>
    </Workspace>
  ),
};
export const ActionsAndFields: Story = {
  render: (args) => (
    <Workspace {...args}>
      <div className="workspace-stack">
        <div className="workspace-actions">
          <Button>
            <Save />
            Save changes
          </Button>
          <Button variant="secondary">
            Preview
            <ArrowRight />
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Remove</Button>
          <Button disabled>Unavailable</Button>
        </div>
        <WorkspacePanel title="A focused task" spacing="action">
          <div className="workspace-stack">
            <Input label="Name" defaultValue="A useful project" />
            <label>
              Account
              <NativeSelect defaultValue="current">
                <option value="current">Current account</option>
                <option value="savings">Savings</option>
              </NativeSelect>
            </label>
            <WorkspaceDisclosure
              title="Optional context"
              description="Inputs stay mounted when collapsed."
            >
              <Input label="Note" />
            </WorkspaceDisclosure>
          </div>
        </WorkspacePanel>
      </div>
    </Workspace>
  ),
};
