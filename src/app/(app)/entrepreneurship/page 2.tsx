import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ExplorationHome } from "@/features/entrepreneurship/explorations/components/exploration-home.component";
export default async function Page() {
  const user = await getCurrentUser();
  return user ? <ExplorationHome userId={user.id} /> : null;
}
