"use client";

import { useCallback, useContext, useRef } from "react";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
import type { ContentCommandResult } from "@/features/content/types/content.types";

type Retry = {
  fingerprint: string;
  key: string;
  execute: (operationKey: string) => Promise<ContentCommandResult>;
};

export function useContentOperation() {
  const sound = useContext(InterfaceSoundContext);
  const retryRef = useRef<Retry | null>(null);
  const inFlightRef = useRef<Promise<ContentCommandResult> | null>(null);

  return useCallback(
    async (
      identity: unknown,
      execute: (operationKey: string) => Promise<ContentCommandResult>,
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
        if (response.delivery === "confirmed") {
          sound?.play(response.error ? "actionBlocked" : "saveConfirmed");
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
    [sound],
  );
}
