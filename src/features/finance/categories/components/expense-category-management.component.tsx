import Link from "next/link";
import { ArrowLeft, FolderTree, Tags } from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  archiveCategoryAction,
  saveCategoryAction,
} from "@/features/finance/categories/actions/expense-category.action";
import { ReusableEntityManagement } from "@/features/finance/entities/components/reusable-entity-management.component";

export async function ExpenseCategoryManagement({
  userId,
}: {
  userId: string;
}) {
  const categories = await prisma.expenseCategory.findMany({
    where: { userId },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
  });

  return (
    <div className="finance-settings finance-entity-management">
      <Link href="/settings/finance" className="finance-settings-back">
        <ArrowLeft aria-hidden="true" />
        Finance settings
      </Link>

      <header className="finance-settings-heading">
        <p className="eyebrow">Expense categories</p>
        <h2>Manage your category vocabulary.</h2>
        <p>
          Keep the list useful and easy to scan. Archived categories remain on
          historical transactions but are no longer available for new expenses.
        </p>
      </header>

      <ReusableEntityManagement
        noun="category"
        pluralNoun="categories"
        items={categories}
        icon={Tags}
        itemIcon={FolderTree}
        addTitle="Add an expense category"
        addDescription="Use a short name that will scan well in the ledger."
        placeholder="e.g. Groceries"
        emptyDescription="You can still record uncategorized expenses and organize them later."
        saveAction={saveCategoryAction}
        archiveAction={archiveCategoryAction}
      />
    </div>
  );
}
