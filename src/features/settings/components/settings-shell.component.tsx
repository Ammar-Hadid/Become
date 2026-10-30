import { ViewTransition } from "react";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import { SettingsNavigation } from "@/features/settings/components/settings-navigation.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { isImageDirectionOwner } from "@/features/seasons/living/image-direction/services/image-direction-owner.service";
import "@/features/settings/styles/settings-workspace.css";

export async function SettingsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const imageDirectionOwner = user
    ? await isImageDirectionOwner(user.id)
    : false;
  return (
    <Workspace area="settings" className="page-shell settings-workspace">
      <SettingsNavigation imageDirectionOwner={imageDirectionOwner} />
      <ViewTransition
        name="settings-content"
        share="motion-data-recompose"
        default="none"
      >
        <div className="settings-content">{children}</div>
      </ViewTransition>
    </Workspace>
  );
}
