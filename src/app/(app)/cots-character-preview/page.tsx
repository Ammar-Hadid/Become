import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CharacterWorkspacePreview } from "@/features/seasons/living/character-workspace/components/character-workspace.component";
import { getNexoSettings } from "@/features/nexo/queries/nexo-settings.query";
import { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = {
  title: "Character of the Season · Become",
};

export default async function CharacterWorkspacePreviewPage() {
  const user = await getCurrentUser();
  if (!user || user.email !== "demotest@gmail.com") notFound();
  const year = 2026;
  const quarter = 4;
  const [pack, nexo] = await Promise.all([
    getLivingSeasonPack(user.id, year, quarter),
    getNexoSettings(user.id),
  ]);
  if (!pack?.profile) notFound();
  const conversationRoute = nexo.config.assignments.find(
    (assignment) => assignment.taskId === "cots.conversation",
  );
  const model = nexo.config.profiles.find(
    (profile) => profile.id === conversationRoute?.profileId,
  );
  return (
    <CharacterWorkspacePreview
      initialProfile={pack.profile}
      year={year}
      quarter={quarter}
      version={pack.profileVersion ?? 1}
      approved={pack.profileApproved}
      active={pack.active}
      responseAvailable={Boolean(
        model && nexo.credentialStatus[model.provider].available,
      )}
    />
  );
}
