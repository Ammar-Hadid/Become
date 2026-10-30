import { AREA_NAVIGATION } from "@/components/layout/navigation/constants/area-navigation.config";
import type { SoundEvent } from "@/components/ui/sound/config/sound-system.config";

function areaForPath(pathname: string) {
  return AREA_NAVIGATION.find(({ href }) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
  )?.area ?? null;
}

/** Only changes between product areas receive a navigation cue. */
export function soundForAreaChange(fromPath: string, toPath: string): SoundEvent | null {
  const destination = areaForPath(toPath);
  if (!destination || destination === areaForPath(fromPath)) return null;
  return destination === "dashboard" ? "returned" : "areaEntered";
}
