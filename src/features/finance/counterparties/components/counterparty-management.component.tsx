import Link from "next/link";
import { ArrowLeft, Handshake, UsersRound } from "lucide-react";
import {
  archiveCounterpartyAction,
  saveCounterpartyAction,
} from "@/features/finance/counterparties/actions/counterparty.action";
import { getCounterpartiesForManagement } from "@/features/finance/counterparties/queries/counterparty.query";
import { ReusableEntityManagement } from "@/features/finance/entities/components/reusable-entity-management.component";

export async function CounterpartyManagement({ userId }: { userId: string }) {
  const counterparties = await getCounterpartiesForManagement(userId);

  return (
    <div className="finance-settings finance-entity-management">
      <Link href="/settings/finance" className="finance-settings-back">
        <ArrowLeft aria-hidden="true" />
        Finance settings
      </Link>

      <header className="finance-settings-heading">
        <p className="eyebrow">Counterparties</p>
        <h2>Manage who your transactions are with.</h2>
        <p>
          Rename people and organizations without rewriting history. Archived
          counterparties remain on past transactions but stay out of new entry.
        </p>
      </header>

      <ReusableEntityManagement
        noun="counterparty"
        pluralNoun="counterparties"
        items={counterparties}
        icon={UsersRound}
        itemIcon={Handshake}
        addTitle="Add a counterparty"
        addDescription="Use the name you want to recognize throughout Finance."
        placeholder="e.g. Albert Heijn"
        emptyDescription="Create a counterparty here or directly while recording a transaction."
        saveAction={saveCounterpartyAction}
        archiveAction={archiveCounterpartyAction}
      />
    </div>
  );
}
