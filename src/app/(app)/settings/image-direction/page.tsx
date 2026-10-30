import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ImageDirectionSettings } from "@/features/settings/image-direction/components/image-direction-settings.component";
import { getImageDirectionSettings } from "@/features/seasons/living/image-direction/queries/image-direction.query";
import { isImageDirectionOwner } from "@/features/seasons/living/image-direction/services/image-direction-owner.service";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isImageDirectionOwner(user.id))) notFound();

  const settings = await getImageDirectionSettings(user.id);
  return <ImageDirectionSettings initialSettings={settings} />;
}
