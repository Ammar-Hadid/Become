"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ThinkingHistoryKind = "idea" | "ideaOutputs" | "decision" | "reflections";

export function ThinkingPagination<Item extends { id: string }>({
  kind,
  recordId,
  initialItems,
  initialCursor,
  renderItem,
  moreLabel,
}: {
  kind: ThinkingHistoryKind;
  recordId: string;
  initialItems: Item[];
  initialCursor: string | null;
  renderItem: (item: Item) => ReactNode;
  moreLabel: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function loadMore() {
    if (!cursor || pending) return;
    const request = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    const params = new URLSearchParams({ kind, id: recordId, cursor });
    try {
      const response = await fetch(
        `/api/direction/thinking/history?${params.toString()}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      const page = (await response.json()) as {
        items: Item[];
        nextCursor: string | null;
      };
      if (request !== requestRef.current) return;
      setItems((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...page.items.filter((item) => !existing.has(item.id)),
        ];
      });
      setCursor(page.nextCursor);
    } catch (loadError) {
      if (
        request === requestRef.current &&
        !(loadError instanceof DOMException && loadError.name === "AbortError")
      ) {
        setError("More history could not be loaded. Try again.");
      }
    } finally {
      if (request === requestRef.current) setPending(false);
    }
  }

  return (
    <>
      {items.map(renderItem)}
      {cursor && (
        <li className="thinking-pagination-row">
          <button type="button" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : moreLabel}
          </button>
        </li>
      )}
      {error && (
        <li className="thinking-pagination-error" role="alert">
          {error}
        </li>
      )}
    </>
  );
}
