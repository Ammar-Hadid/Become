"use client";

import { useCallback, useRef } from "react";
import type {
  ReviewCommand,
  TransitionCommand,
} from "@/features/reviews/contracts/schemas/review.schema";
import {
  sendReviewCommand,
  type ReviewClientResult,
} from "../adapters/review-command-client.adapter";

type WithoutKey<T> = T extends unknown ? Omit<T, "operationKey"> : never;
type OperationInput = WithoutKey<ReviewCommand | TransitionCommand>;
type Attempt = {
  fingerprint: string;
  command: ReviewCommand | TransitionCommand;
};

export function useReviewOperation() {
  const uncertainRef = useRef<Attempt | null>(null);
  const inFlightRef = useRef<Promise<ReviewClientResult> | null>(null);
  return useCallback(
    async (input: OperationInput): Promise<ReviewClientResult> => {
      if (inFlightRef.current) return inFlightRef.current;
      const fingerprint = JSON.stringify(input);
      const uncertain = uncertainRef.current;
      const recoveringPrevious =
        uncertain && uncertain.fingerprint !== fingerprint;
      const attempt = uncertain ?? {
        fingerprint,
        command: { ...input, operationKey: crypto.randomUUID() },
      };
      const request = sendReviewCommand(attempt.command).then((result) => {
        uncertainRef.current = result.delivery === "uncertain" ? attempt : null;
        if (recoveringPrevious && !result.error)
          return {
            ...result,
            recoveredPrevious: true,
            error:
              "The earlier save was recovered. Your newer entries are still here; review them before saving again.",
          };
        return result;
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
