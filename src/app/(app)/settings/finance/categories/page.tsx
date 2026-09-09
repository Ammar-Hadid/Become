import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ExpenseCategoryManagement } from "@/features/finance/categories/components/expense-category-management.component";

export default async function Page() {
  const user = await getCurrentUser();
  return user ? <ExpenseCategoryManagement userId={user.id} /> : null;
}
