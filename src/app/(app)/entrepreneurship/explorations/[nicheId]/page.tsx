import { redirect } from "next/navigation";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const { nicheId } = await params;
  redirect(explorationWorkspaceHref(nicheId, "overview"));
}
