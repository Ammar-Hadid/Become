import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OpportunitiesPage } from "@/features/finance/opportunities/components/opportunities-page.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <OpportunitiesPage userId={user.id} /> : null;
}
