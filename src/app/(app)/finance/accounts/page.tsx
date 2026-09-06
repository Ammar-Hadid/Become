import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { AccountsPage } from "@/features/finance/accounts/components/accounts-page.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <AccountsPage userId={user.id} /> : null;
}
