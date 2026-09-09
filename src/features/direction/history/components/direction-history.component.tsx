"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  DirectionChangeView,
  PageResult,
} from "@/features/direction/types/direction.types";

export function DirectionHistory({
  kind,
  id,
  initialItems,
  initialCursor,
}: {
  kind: "GOAL" | "EXPERIMENT";
  id: string;
  initialItems: DirectionChangeView[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOlder() {
    if (!cursor) return;
    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, id, cursor });
      const response = await fetch(`/api/direction/history?${params}`);
      const body = (await response.json().catch(() => null)) as
        (PageResult<DirectionChangeView> & { error?: string }) | null;
      if (!response.ok || !body?.items)
        throw new Error(body?.error ?? "Older changes could not be loaded.");
      setItems((current) => [
        ...current,
        ...body.items.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setCursor(body.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Older changes could not be loaded.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!items.length) return null;

  return (
    <section
      className="direction-history"
      aria-labelledby={`direction-${kind.toLowerCase()}-history`}
    >
      <p className="eyebrow">Change record</p>
      <h2 id={`direction-${kind.toLowerCase()}-history`}>
        How this intention changed
      </h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <span aria-hidden="true" />
            <div>
              <strong>{item.kind.replaceAll("_", " ").toLowerCase()}</strong>
              <p>{item.reason}</p>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString()}
              </time>
              {item.details.length > 0 && (
                <details>
                  <summary>Definition and evidence at this change</summary>
                  <ul>
                    {item.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </li>
        ))}
      </ol>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {cursor && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => void loadOlder()}
        >
          {pending && (
            <LoaderCircle className="direction-spin" aria-hidden="true" />
          )}{" "}
          {pending ? "Loading…" : "Load older changes"}
        </Button>
      )}
    </section>
  );
}
