"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  CriterionEvaluation,
  SourceItem,
} from "@/features/direction/types/direction.types";

function SourceRecord({ source }: { source: SourceItem }) {
  const content = (
    <>
      <span>
        <strong>{source.label}</strong>
        {source.note && <small>{source.note}</small>}
      </span>
      <em data-state={source.state}>{source.state.toLowerCase()}</em>
      <small>{source.value}</small>
      {source.href && <ArrowRight aria-hidden="true" />}
    </>
  );

  return source.href ? (
    <Link href={source.href}>{content}</Link>
  ) : (
    <div>{content}</div>
  );
}

export function CriterionSourceList({
  criterionId,
  initialSources,
  initialCursor,
  initialFingerprint,
  sourceCount,
}: {
  criterionId: string;
  initialSources: SourceItem[];
  initialCursor: string | null;
  initialFingerprint: string;
  sourceCount: number;
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  async function loadMore() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/direction/criteria/${encodeURIComponent(criterionId)}/sources?cursor=${encodeURIComponent(cursor)}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      const body = (await response.json().catch(() => null)) as
        (CriterionEvaluation & { error?: string }) | null;
      if (!response.ok || !body?.sources) {
        throw new Error(
          body?.error ?? "More source records could not be loaded.",
        );
      }
      if (body.fingerprint !== initialFingerprint) {
        setChanged(true);
        setError(
          "Evidence changed while these records were loading. Refresh this reading before continuing.",
        );
        return;
      }
      setSources((current) => [
        ...current,
        ...body.sources.filter(
          (source) => !current.some(({ id }) => id === source.id),
        ),
      ]);
      setCursor(body.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "More source records could not be loaded.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="direction-preview-sources direction-preview-sources--full">
      <summary>
        Inspect {sourceCount} source {sourceCount === 1 ? "record" : "records"}
      </summary>
      <div className="direction-source-records">
        {sources.map((source) => (
          <SourceRecord key={source.id} source={source} />
        ))}
      </div>
      {error && (
        <p className="direction-inline-error" role="alert">
          {error}
        </p>
      )}
      {cursor && !changed && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => void loadMore()}
        >
          {pending && (
            <LoaderCircle className="direction-spin" aria-hidden="true" />
          )}
          {pending ? "Loading…" : "Load more source records"}
        </Button>
      )}
      {changed && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.refresh()}
        >
          Refresh evidence reading
        </Button>
      )}
    </details>
  );
}
