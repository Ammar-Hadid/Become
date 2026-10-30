"use client";

import { useContext } from "react";
import { InterfaceSoundContext } from "../components/interface-sound-provider.component";

export function useInterfaceSound() {
  const sound = useContext(InterfaceSoundContext);
  if (!sound) throw new Error("useInterfaceSound must be used within InterfaceSoundProvider.");
  return sound;
}
