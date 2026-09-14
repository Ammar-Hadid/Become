import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getAudienceRecords } from "@/features/entrepreneurship/audiences/queries/audience.query";
import { AudiencePage } from "@/features/entrepreneurship/audiences/components/audience-page.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const q = await searchParams;
  const kind = q.kind === "person" ? "person" : "segment";
  const data = await getAudienceRecords(user.id, {
    kind,
    search: q.q,
    archived: q.archived === "true",
    cursor: q.cursor,
  });
  return (
    <AudiencePage
      data={data}
      kind={kind}
      search={q.q}
      archived={q.archived === "true"}
    />
  );
}
