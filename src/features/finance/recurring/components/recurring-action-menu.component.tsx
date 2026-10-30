"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Archive, Ellipsis, Pause, Play, Settings } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { recurringStatusAction } from "@/features/finance/recurring/actions/recurring-expense.action";
import {
  RecurringForm,
  type RecurringFormValues,
} from "@/features/finance/recurring/components/recurring-form.component";
import type { ExpenseCategoryOption } from "@/features/finance/categories/components/expense-category-combobox.component";
import type { CounterpartyOption } from "@/features/finance/counterparties/components/counterparty-combobox.component";

type RecurringActionMenuProps = {
  commitmentName: string;
  id: string;
  status: "ACTIVE" | "PAUSED";
  initial: RecurringFormValues;
  accounts: { id: string; name: string; currency: string }[];
  categories: ExpenseCategoryOption[];
  counterparties: CounterpartyOption[];
};

export function RecurringActionMenu(props: RecurringActionMenuProps) {
  return (
    <SubMenu
      label={`Actions for ${props.commitmentName}`}
      placement="bottom-end"
      className="finance-recurring-action-menu"
      closeOnSelect={false}
      trigger={(triggerProps) => (
        <Button {...triggerProps} variant="ghost" size="icon">
          <Ellipsis aria-hidden="true" />
        </Button>
      )}
    >
      <RecurringActionMenuItems {...props} />
    </SubMenu>
  );
}

function RecurringActionMenuItems({
  commitmentName,
  id,
  status,
  initial,
  accounts,
  categories,
  counterparties,
}: RecurringActionMenuProps) {
  const close = useSubMenuClose();

  return (
    <>
      <MenuItem
        render={({ className, role }) => (
          <FinanceDialog
            triggerLabel="Edit schedule and terms"
            title={`Edit ${commitmentName}`}
            description="Changes apply prospectively. Existing occurrences keep their recorded terms."
            variant="quiet"
            icon={false}
            className={className}
            unstyledTrigger
            triggerIcon={<Settings aria-hidden="true" />}
            triggerRole={role}
            onOpenChange={(dialogOpen) => {
              if (!dialogOpen) close(true);
            }}
          >
            <RecurringForm
              accounts={accounts}
              categories={categories}
              counterparties={counterparties}
              initial={initial}
            />
          </FinanceDialog>
        )}
      />
      <MenuItem
        render={({ className, role }) => (
          <FinanceForm
            action={recurringStatusAction}
            submitLabel={
              status === "ACTIVE" ? "Pause recurrence" : "Resume recurrence"
            }
            submitVariant="ghost"
            submitIcon={
              status === "ACTIVE" ? (
                <Pause aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )
            }
            submitClassName={className}
            submitRole={role}
            showSuccess={false}
            formClassName="flex flex-col"
            onSaved={() => close(true)}
          >
            <input type="hidden" name="id" value={id} />
            <input
              type="hidden"
              name="command"
              value={status === "ACTIVE" ? "pause" : "resume"}
            />
          </FinanceForm>
        )}
      />
      <MenuItem
        render={({ className, role }) => (
          <FinanceForm
            action={recurringStatusAction}
            submitLabel="Archive recurrence"
            submitVariant="ghost"
            submitIcon={<Archive aria-hidden="true" />}
            submitClassName={className}
            submitRole={role}
            showSuccess={false}
            formClassName="flex flex-col"
            onSaved={() => close(true)}
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="command" value="archive" />
          </FinanceForm>
        )}
      />
    </>
  );
}
