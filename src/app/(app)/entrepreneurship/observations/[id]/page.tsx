import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ObservationDetail } from "@/features/entrepreneurship/observations/components/observation-detail.component";
export default async function Page({
  params,
  searchParams,
}: {
  searchParams: Promise<{ revision?: string }>;
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <ObservationDetail
      userId={user.id}
      revisionId={(await searchParams).revision}
      {...await params}
    />
  );
}
