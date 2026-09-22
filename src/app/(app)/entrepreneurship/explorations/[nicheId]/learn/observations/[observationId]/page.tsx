import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ObservationDetail } from "@/features/entrepreneurship/observations/components/observation-detail.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string; observationId: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, observationId } = await params;
  return (
    <ObservationDetail
      userId={user.id}
      nicheId={nicheId}
      id={observationId}
      revisionId={(await searchParams).revision}
    />
  );
}
