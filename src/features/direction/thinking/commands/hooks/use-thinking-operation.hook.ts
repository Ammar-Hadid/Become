"use client";

import { useCallback, useRef } from "react";
import type { ThinkingCommandResult } from "@/features/direction/thinking/types/thinking.types";

type Retry = {
  fingerprint: string;
  key: string;
  execute: (operationKey: string) => Promise<ThinkingCommandResult>;
};

export function useThinkingOperation() {
  const retryRef = useRef<Retry | null>(null);
  const inFlightRef = useRef<Promise<ThinkingCommandResult> | null>(null);

  return useCallback(
    async (
      identity: unknown,
      execute: (operationKey: string) => Promise<ThinkingCommandResult>,
    ) => {
      if (inFlightRef.current) return inFlightRef.current;
      const fingerprint = JSON.stringify(identity);
      const uncertain = retryRef.current;
      const recoveringDifferentPayload =
        uncertain && uncertain.fingerprint !== fingerprint;
      const attempt = uncertain ?? {
        fingerprint,
        key: crypto.randomUUID(),
        execute,
      };
      const request = attempt.execute(attempt.key).then((response) => {
        if (response.delivery === "uncertain") {
          retryRef.current = attempt;
          return response;
        }
        retryRef.current = null;
        if (recoveringDifferentPayload && !response.error) {
          return {
            ...response,
            error:
              "Your earlier save was recovered. Your newer changes are still here; review and save them again.",
          };
        }
        return response;
      });
      inFlightRef.current = request;
      try {
        return await request;
      } finally {
        inFlightRef.current = null;
      }
    },
    [],
  );
}
