import { Card } from "@/components/ui/cards/card.component";
import type { LucideIcon } from "lucide-react";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceField } from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import type { FinanceFormState } from "@/features/finance/types/finance.types";

type ManagedEntity = {
  id: string;
  name: string;
  archivedAt: Date | null;
};

export function ReusableEntityManagement({
  noun,
  pluralNoun,
  items,
  icon: Icon,
  itemIcon: ItemIcon,
  addTitle,
  addDescription,
  placeholder,
  emptyDescription,
  saveAction,
  archiveAction,
}: {
  noun: string;
  pluralNoun: string;
  items: ManagedEntity[];
  icon: LucideIcon;
  itemIcon: LucideIcon;
  addTitle: string;
  addDescription: string;
  placeholder: string;
  emptyDescription: string;
  saveAction: (data: FormData) => Promise<FinanceFormState>;
  archiveAction: (data: FormData) => Promise<FinanceFormState>;
}) {
  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);

  const list = (entities: ManagedEntity[], archived: boolean) => (
    <div className="finance-entity-list">
      {entities.map((entity) => (
        <article key={entity.id}>
          <span>
            <ItemIcon aria-hidden="true" />
          </span>
          <strong>
            {entity.name}
            {archived && <small>Archived</small>}
          </strong>
          <div>
            <FinanceDialog
              triggerLabel={`Rename ${noun}`}
              title={`Rename ${entity.name}`}
              variant="quiet"
              icon={false}
            >
              <FinanceForm
                action={saveAction}
                submitLabel={`Rename ${noun}`}
                submitVariant="secondary"
                closeOnSuccess
              >
                <input type="hidden" name="id" value={entity.id} />
                <FinanceField
                  label="Name"
                  name="name"
                  defaultValue={entity.name}
                  required
                />
              </FinanceForm>
            </FinanceDialog>
            {!archived && (
              <FinanceForm
                action={archiveAction}
                submitLabel={`Archive ${noun}`}
                submitVariant="ghost"
              >
                <input type="hidden" name="id" value={entity.id} />
              </FinanceForm>
            )}
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <>
      <Card spacing="dense" className="finance-settings-card">
        <div className="finance-settings-intro">
          <span>
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h3>Active {pluralNoun}</h3>
            <p>Available when recording new transactions.</p>
          </div>
          <FinanceDialog
            triggerLabel={`Add ${noun}`}
            title={addTitle}
            description={addDescription}
            variant="secondary"
          >
            <FinanceForm
              action={saveAction}
              submitLabel={`Add ${noun}`}
              resetOnSuccess
              closeOnSuccess
            >
              <FinanceField
                label={`${noun[0]?.toUpperCase()}${noun.slice(1)} name`}
                name="name"
                placeholder={placeholder}
                required
              />
            </FinanceForm>
          </FinanceDialog>
        </div>

        {activeItems.length ? (
          list(activeItems, false)
        ) : (
          <div className="finance-settings-empty">
            <Icon aria-hidden="true" />
            <div>
              <strong>No active {pluralNoun}</strong>
              <p>{emptyDescription}</p>
            </div>
          </div>
        )}
      </Card>

      {archivedItems.length > 0 && (
        <Card spacing="dense" className="finance-settings-card">
          <div className="finance-settings-intro">
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <h3>Archived {pluralNoun}</h3>
              <p>
                Kept on historical transactions and excluded from new
                transaction suggestions.
              </p>
            </div>
          </div>
          {list(archivedItems, true)}
        </Card>
      )}
    </>
  );
}
