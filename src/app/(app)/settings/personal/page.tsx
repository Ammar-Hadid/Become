import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getPersonalSettings } from "@/features/settings/personal/queries/personal-settings.query";
import { PersonalSettings } from "@/features/settings/personal/components/personal-settings.component";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return null;
  const settings = await getPersonalSettings(user.id);
  return settings ? <PersonalSettings {...settings} /> : null;
}
