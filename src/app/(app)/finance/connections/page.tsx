import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { BankConnectionsPage } from "@/features/open-banking/connections/components/bank-connections-page.component";

export default async function Page() {
  const user = await getCurrentUser();
  return user ? <BankConnectionsPage userId={user.id} /> : null;
}
