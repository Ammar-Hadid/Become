import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { FinanceSettings } from "@/features/finance/settings/components/finance-settings.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <FinanceSettings userId={user.id} /> : null;
}
