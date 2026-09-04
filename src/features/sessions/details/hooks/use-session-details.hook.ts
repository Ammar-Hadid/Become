"use client";

import { useContext } from "react";
import { SessionDetailsContext } from "@/features/sessions/details/components/session-details-provider.component";

export function useSessionDetails() {
  const context = useContext(SessionDetailsContext);
  if (!context) {
    throw new Error(
      "useSessionDetails must be used within a SessionDetailsProvider.",
    );
  }
  return context;
}
