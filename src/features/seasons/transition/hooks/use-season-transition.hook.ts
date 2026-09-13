"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReviewOperation } from "@/features/reviews/commands/hooks/use-review-operation.hook";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { TransitionCommand } from "@/features/reviews/contracts/schemas/review.schema";
import { clearTransitionSuppression } from "../utils/transition-storage.util";

const CLIENT_KEY = "become:season-transition-client";
const TAB_DISCOVERY_MS = 100;
const LEASE_RENEW_MS = 20_000;

function useTransitionClient() {
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    const nonce = crypto.randomUUID();
    const discoveryAvailable = typeof BroadcastChannel !== "undefined";
    let identity: string;
    try {
      identity = discoveryAvailable
        ? sessionStorage.getItem(CLIENT_KEY) || crypto.randomUUID()
        : crypto.randomUUID();
    } catch {
      identity = crypto.randomUUID();
    }
    const remember = () => {
      try {
        sessionStorage.setItem(CLIENT_KEY, identity);
      } catch {
        /* A document-local identity still supports lease ownership. */
      }
    };
    remember();
    const channel = !discoveryAvailable
      ? null
      : new BroadcastChannel("become:season-transition-clients");
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        const message = event.data;
        if (
          !message ||
          message.clientId !== identity ||
          message.nonce === nonce
        )
          return;
        if (message.type === "DISCOVER")
          channel.postMessage({
            type: "OWNER",
            clientId: identity,
            nonce,
            forNonce: message.nonce,
          });
        else if (message.type === "OWNER" && message.forNonce === nonce) {
          identity = crypto.randomUUID();
          remember();
          setClientId(identity);
        }
      };
      channel.postMessage({ type: "DISCOVER", clientId: identity, nonce });
    }
    // Discover a cloned sessionStorage identity before claiming a server lease.
    const ready = window.setTimeout(
      () => setClientId(identity),
      channel ? TAB_DISCOVERY_MS : 0,
    );
    return () => {
      clearTimeout(ready);
      channel?.close();
    };
  }, []);
  return clientId;
}

export function useSeasonTransition(initialView: SeasonTransitionView) {
  const run = useReviewOperation();
  const clientId = useTransitionClient();
  const [view, setView] = useState(initialView);
  const viewRef = useRef(initialView);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const pendingRequest = useRef<Promise<unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);

  const command = useCallback(
    async (type: TransitionCommand["type"], movement?: number) => {
      if ((type === "DEFER" || type === "SKIP") && pendingRequest.current)
        await pendingRequest.current;
      const current = viewRef.current;
      const commandClient =
        clientId ??
        (type === "DEFER" || type === "SKIP" ? crypto.randomUUID() : null);
      if (
        !commandClient ||
        !current.from ||
        current.replay ||
        pendingRef.current
      )
        return null;
      pendingRef.current = true;
      let finishRequest: () => void = () => {};
      pendingRequest.current = new Promise<void>((resolve) => {
        finishRequest = resolve;
      });
      setPending(true);
      setError(null);
      try {
        const input = {
          type,
          startOn: current.from.startOn,
          expectedVersion: current.version,
          clientId: commandClient,
          ...(type === "BEGIN" && current.review
            ? {
                factsFingerprint: current.review.facts.fingerprint,
                previewReviewVersion: current.review.version,
                previewEditionId: current.review.edition?.id ?? null,
              }
            : {}),
          ...(movement === undefined ? {} : { movement }),
        };
        const request = run(input);
        let result = await request;
        if (
          result.transition &&
          result.transition.version >= viewRef.current.version
        )
          viewRef.current = {
            ...result.transition,
            review:
              result.transition.review ??
              (result.transition.editionId === viewRef.current.editionId
                ? viewRef.current.review
                : null),
          };
        if (result.recoveredPrevious && result.delivery === "confirmed") {
          if (
            result.transition &&
            (result.transition.disposition === "COMPLETED" ||
              result.transition.disposition === "SKIPPED")
          )
            result = { ...result, error: null };
          else
            result = await run({
              ...input,
              expectedVersion: viewRef.current.version,
            });
        }
        if (
          result.transition &&
          result.transition.version >= viewRef.current.version
        ) {
          const transition = {
            ...result.transition,
            review:
              result.transition.review ??
              (result.transition.editionId === viewRef.current.editionId
                ? viewRef.current.review
                : null),
          };
          viewRef.current = transition;
          setView(transition);
          result = { ...result, transition };
        }
        if (result.error) setError(result.error);
        else if (
          (type === "BEGIN" || type === "COMPLETE") &&
          result.transition
        ) {
          clearTransitionSuppression(initialView);
          clearTransitionSuppression(result.transition);
        }
        return result;
      } finally {
        pendingRef.current = false;
        pendingRequest.current = null;
        setPending(false);
        finishRequest();
      }
    },
    [clientId, initialView, run],
  );

  useEffect(() => {
    if (
      !clientId ||
      !initialView.editionId ||
      initialView.replay ||
      initialView.occupied ||
      startedRef.current === clientId
    )
      return;
    startedRef.current = clientId;
    void command("BEGIN");
  }, [
    clientId,
    command,
    initialView.editionId,
    initialView.occupied,
    initialView.replay,
  ]);

  useEffect(() => {
    if (!view.leaseOwned || view.replay || !clientId) return;
    const renew = () => {
      if (document.visibilityState === "visible" && !pendingRef.current)
        void command("RENEW");
    };
    const timer = window.setInterval(renew, LEASE_RENEW_MS);
    document.addEventListener("visibilitychange", renew);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", renew);
    };
  }, [clientId, command, view.leaseOwned, view.replay]);

  return { view, pending, error, ready: Boolean(clientId), command };
}
