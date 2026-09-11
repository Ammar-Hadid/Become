"use client";

import { useContext } from "react";
import { CotsPresentationContext } from "@/features/seasons/presentation/components/cots-presentation-provider.component";

export function useCotsPresentation() {
  return useContext(CotsPresentationContext);
}
