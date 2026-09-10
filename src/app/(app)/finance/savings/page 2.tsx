import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { SavingsPage } from "@/features/finance/savings/components/savings-page.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <SavingsPage userId={user.id} /> : null;
}
