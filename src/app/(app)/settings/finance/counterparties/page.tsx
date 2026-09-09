import { CounterpartyManagement } from "@/features/finance/counterparties/components/counterparty-management.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function Page() {
  const user = await getCurrentUser();
  return user ? <CounterpartyManagement userId={user.id} /> : null;
}
