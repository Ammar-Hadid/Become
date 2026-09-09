"use client";

import { useCallback, useRef } from "react";
import type { DirectionClientResult } from "@/features/direction/commands/utils/direction-command-client.util";

type Retry = {
  fingerprint: string;
  key: string;
  execute: (operationKey: string) => Promise<DirectionClientResult>;
};

export function useStableOperation() {
  const retryRef = useRef<Retry | null>(null);
  const inFlightRef = useRef<Promise<DirectionClientResult> | null>(null);

  return useCallback(
    async (
      identity: unknown,
      execute: (operationKey: string) => Promise<DirectionClientResult>,
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
              "Your earlier save was recovered. Your newer edits are still here; review them and save again as a revision.",
            recoveredPrevious: true,
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
