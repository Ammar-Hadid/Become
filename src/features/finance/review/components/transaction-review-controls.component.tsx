"use client";

import { useRouter } from "next/navigation";
import { Check, Tag } from "lucide-react";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  categorizeTransactionAction,
  reviewTransactionAction,
} from "@/features/finance/review/actions/financial-review.action";

export function TransactionReviewControls({
  transactionId,
  categoryId,
  categories,
  canReview,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
  canReview: boolean;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="finance-row-review-controls">
      {!!categories.length && (
        <FinanceForm
          action={categorizeTransactionAction}
          submitLabel="Save category"
          submitVariant="ghost"
          submitIcon={<Tag aria-hidden="true" />}
          formClassName="finance-inline-category-form"
          showSuccess={false}
          onSaved={refresh}
        >
          <input type="hidden" name="id" value={transactionId} />
          <label>
            <span className="sr-only">Category</span>
            <select
              className="finance-select"
              name="categoryId"
              defaultValue={categoryId ?? ""}
              aria-label="Category"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </FinanceForm>
      )}
      {canReview && (
        <FinanceForm
          action={reviewTransactionAction}
          submitLabel="Mark reviewed"
          submitVariant="ghost"
          submitIcon={<Check aria-hidden="true" />}
          formClassName=""
          showSuccess={false}
          onSaved={refresh}
        >
          <input type="hidden" name="id" value={transactionId} />
        </FinanceForm>
      )}
    </div>
  );
}
