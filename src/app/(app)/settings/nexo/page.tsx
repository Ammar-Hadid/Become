import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { NexoSettings } from "@/features/nexo/components/nexo-settings.component";
import { getNexoSettings } from "@/features/nexo/queries/nexo-settings.query";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return null;
  const settings = await getNexoSettings(user.id);
  return <NexoSettings key={settings.version} {...settings} />;
}
