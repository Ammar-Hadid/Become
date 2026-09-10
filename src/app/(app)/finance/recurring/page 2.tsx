import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { RecurringPage } from "@/features/finance/recurring/components/recurring-page.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <RecurringPage userId={user.id} /> : null;
}
