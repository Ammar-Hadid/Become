import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReactionsCandidate } from "@/features/design-review/character-workspace/components/reactions-candidate.component";
import { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = {
  title: "Reactions step candidate · Become",
};

export default async function ReactionsCandidatePage() {
  const user = await getCurrentUser();
  if (!user || user.email !== "demotest@gmail.com") notFound();
  const pack = await getLivingSeasonPack(user.id, 2026, 4);
  if (!pack?.profile) notFound();
  return <ReactionsCandidate initialProfile={pack.profile} />;
}
