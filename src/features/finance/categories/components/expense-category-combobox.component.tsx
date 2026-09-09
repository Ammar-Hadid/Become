"use client";

import { saveCategoryAction } from "@/features/finance/categories/actions/expense-category.action";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/features/finance/entities/components/reusable-entity-combobox.component";

export type ExpenseCategoryOption = ReusableEntityOption;

export function ExpenseCategoryCombobox({
  categories,
  initialId,
  initialName,
}: {
  categories: ExpenseCategoryOption[];
  initialId?: string | null;
  initialName?: string | null;
}) {
  return (
    <ReusableEntityCombobox
      label="Category"
      entityName="category"
      idFieldName="expenseCategoryId"
      queryFieldName="expenseCategoryQuery"
      options={categories}
      initialId={initialId}
      initialName={initialName}
      createAction={saveCategoryAction}
      placeholder="Search or create a category"
    />
  );
}
