"use client";

import { saveCounterpartyAction } from "@/features/finance/counterparties/actions/counterparty.action";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/features/finance/entities/components/reusable-entity-combobox.component";

export type CounterpartyOption = ReusableEntityOption;

export function CounterpartyCombobox({
  label,
  counterparties,
  initialId,
  initialName,
}: {
  label: string;
  counterparties: CounterpartyOption[];
  initialId?: string | null;
  initialName?: string | null;
}) {
  return (
    <ReusableEntityCombobox
      label={label}
      entityName="counterparty"
      idFieldName="counterpartyId"
      queryFieldName="counterpartyQuery"
      options={counterparties}
      initialId={initialId}
      initialName={initialName}
      createAction={saveCounterpartyAction}
      placeholder="Search or create a counterparty"
    />
  );
}
