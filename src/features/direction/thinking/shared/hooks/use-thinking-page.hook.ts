"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThinkingPage } from "@/features/direction/thinking/types/thinking.types";

type PageState<Item> = ThinkingPage<Item> & {
  identity: string;
  pending: boolean;
  error: string | null;
};

function freshState<Item>(
  identity: string,
  initialData: ThinkingPage<Item>,
): PageState<Item> {
  return {
    identity,
    items: initialData.items,
    nextCursor: initialData.nextCursor,
    pending: false,
    error: null,
  };
}

export function useThinkingPage<Item extends { id: string }>({
  identity,
  initialData,
  endpoint,
  query,
}: {
  identity: string;
  initialData: ThinkingPage<Item>;
  endpoint: string;
  query: URLSearchParams;
}) {
  const [state, setState] = useState<PageState<Item>>(() =>
    freshState(identity, initialData),
  );
  const visible =
    state.identity === identity ? state : freshState(identity, initialData);
  const identityRef = useRef(identity);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    identityRef.current = identity;
    requestRef.current += 1;
    abortRef.current?.abort();
    return () => abortRef.current?.abort();
  }, [identity]);

  const prepend = useCallback(
    (item: Item) => {
      setState((current) => {
        const base =
          current.identity === identity
            ? current
            : freshState(identity, initialData);
        return {
          ...base,
          items: [item, ...base.items.filter(({ id }) => id !== item.id)],
        };
      });
    },
    [identity, initialData],
  );

  async function loadMore() {
    if (!visible.nextCursor || visible.pending) return;
    const request = ++requestRef.current;
    const requestedIdentity = identity;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...visible, pending: true, error: null });
    const params = new URLSearchParams(query);
    params.set("cursor", visible.nextCursor);
    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error();
      const page = (await response.json()) as ThinkingPage<Item>;
      if (
        request !== requestRef.current ||
        requestedIdentity !== identityRef.current
      )
        return;
      setState((current) => {
        const base =
          current.identity === identity
            ? current
            : freshState(identity, initialData);
        const known = new Set(base.items.map(({ id }) => id));
        return {
          ...base,
          items: [
            ...base.items,
            ...page.items.filter(({ id }) => !known.has(id)),
          ],
          nextCursor: page.nextCursor,
          pending: false,
          error: null,
        };
      });
    } catch (loadError) {
      if (
        request === requestRef.current &&
        requestedIdentity === identityRef.current &&
        !(loadError instanceof DOMException && loadError.name === "AbortError")
      ) {
        setState((current) => ({
          ...(current.identity === identity
            ? current
            : freshState(identity, initialData)),
          pending: false,
          error: "More records could not be loaded. Try again.",
        }));
      }
    }
  }

  return { ...visible, loadMore, prepend };
}
