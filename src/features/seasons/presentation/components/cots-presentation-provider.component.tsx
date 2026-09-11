"use client";

import { createContext, useMemo, type ReactNode } from "react";
import { isCurrentBecomeSeason } from "@/features/seasons/presentation/utils/current-season.util";
import type { SeasonMediaView } from "@/features/seasons/types/season.types";

type PresentationMedia = SeasonMediaView & {
  previewHref?: string | null;
  hasAlpha?: boolean;
};

export type CotsPresentationContextValue = {
  snapshotKey: string;
  year: number;
  quarter: number;
  media: PresentationMedia | null;
} | null;

export const CotsPresentationContext =
  createContext<CotsPresentationContextValue>(null);

export function CotsPresentationProvider({
  initialMedia,
  userId,
  year,
  quarter,
  children,
}: {
  initialMedia: PresentationMedia | null;
  userId: string;
  year: number;
  quarter: number;
  children: ReactNode;
}) {
  const snapshotKey = `${userId}:${year}:${quarter}`;
  const current = isCurrentBecomeSeason(year, quarter);
  const value = useMemo<CotsPresentationContextValue>(
    () => ({
      snapshotKey,
      year,
      quarter,
      media: current && initialMedia?.previewHref ? initialMedia : null,
    }),
    [current, initialMedia, quarter, snapshotKey, year],
  );

  return (
    <CotsPresentationContext.Provider value={value}>
      {children}
    </CotsPresentationContext.Provider>
  );
}
