import type { Metadata } from "next";
import { ContentDesk } from "@/features/content/home/components/content-desk.component";
import { getContentDesk } from "@/features/content/queries/content.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    archived?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const query = params.q ?? "";
  const includeArchived = params.archived === "true";
  const data = await getContentDesk(user.id, {
    q: query,
    cursor: params.cursor,
    archived: includeArchived,
  });

  return (
    <ContentDesk data={data} query={query} includeArchived={includeArchived} />
  );
}
