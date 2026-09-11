"use client";

import { Check, ImagePlus, Quote, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { CotsImageRail } from "@/features/seasons/discovery/components/cots-image-rail.component";
import { CotsManualEntry } from "@/features/seasons/discovery/components/cots-manual-entry.component";
import { CotsWordDeck } from "@/features/seasons/discovery/components/cots-word-deck.component";
import { useCotsCollection } from "@/features/seasons/discovery/hooks/use-cots-collection.hook";
import type { SeasonView } from "@/features/seasons/types/season.types";

export function CotsCollectionDiscovery({
  season,
  onClose,
}: {
  season: SeasonView;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    collection,
    pages,
    loadingCollection,
    discovering,
    pendingCandidateRefs,
    pendingAction,
    error,
    discover,
    selectCandidate,
    confirmSelections,
    retrySelection,
    addManualImage,
    addManualText,
  } = useCotsCollection(season.year, season.quarter);
  const [kind, setKind] = useState<"IMAGE" | "TEXT">("IMAGE");
  const [posterOverride, setPosterOverride] = useState<string | null>(null);
  const page = pages[kind];
  const selections = useMemo(
    () =>
      collection?.selections.filter(({ candidate }) =>
        kind === "IMAGE"
          ? candidate.form === "IMAGE"
          : candidate.form !== "IMAGE",
      ) ?? [],
    [collection?.selections, kind],
  );
  const desiredPosterId =
    posterOverride ??
    selections.find(({ desiredPoster }) => desiredPoster)?.id ??
    "";
  const selectedCount = selections.filter(
    ({ status }) => status === "SELECTED",
  ).length;

  useEffect(() => {
    if (collection?.identity && !page) void discover(kind);
  }, [collection?.identity, discover, kind, page]);

  return (
    <section
      className="cots-collection-discovery"
      aria-labelledby="cots-collection-discovery-title"
    >
      <header>
        <div>
          <p className="eyebrow">Discover more</p>
          <h3 id="cots-collection-discovery-title">
            Find another piece of this chapter.
          </h3>
          <p>
            New results use the current source context. Earlier choices keep the
            source details they were saved with.
          </p>
        </div>
        <button type="button" aria-label="Close discovery" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div
        className="cots-collection-tabs"
        role="tablist"
        aria-label="Discovery type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={kind === "IMAGE"}
          onClick={() => setKind("IMAGE")}
        >
          <ImagePlus aria-hidden="true" /> Images
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === "TEXT"}
          onClick={() => setKind("TEXT")}
        >
          <Quote aria-hidden="true" /> Words
        </button>
      </div>

      {loadingCollection ? (
        <p className="cots-collection-loading" role="status">
          Preparing discovery…
        </p>
      ) : kind === "IMAGE" ? (
        <>
          <CotsImageRail
            page={pages.IMAGE}
            selections={selections}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering === "IMAGE"}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(id) => void retrySelection(id)}
            onLoadMore={() => void discover("IMAGE", true)}
          />
          <CotsManualEntry
            kind="image"
            disabled={Boolean(pendingAction)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey) =>
              addManualText(draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
          />
          {selections.length > 0 && (
            <label className="cots-collection-poster-choice">
              <span>Poster choice</span>
              <select
                value={desiredPosterId}
                onChange={(event) => setPosterOverride(event.target.value)}
              >
                <option value="">Keep the current poster</option>
                {selections.map((selection) => (
                  <option key={selection.id} value={selection.id}>
                    {selection.candidate.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      ) : (
        <>
          <CotsWordDeck
            page={pages.TEXT}
            selections={selections}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering === "TEXT"}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(id) => void retrySelection(id)}
            onLoadMore={() => void discover("TEXT", true)}
          />
          <CotsManualEntry
            kind="text"
            disabled={Boolean(pendingAction)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey) =>
              addManualText(draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
          />
        </>
      )}

      {error && (
        <p className="cots-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <span aria-live="polite">
          {selectedCount
            ? `${selectedCount} new ${kind === "IMAGE" ? "image" : "item"}${selectedCount === 1 ? "" : "s"} selected`
            : "Nothing new selected"}
        </span>
        <Button
          type="button"
          disabled={!selectedCount || Boolean(pendingAction)}
          onClick={async () => {
            const saved = await confirmSelections(
              kind === "IMAGE" ? desiredPosterId || undefined : undefined,
            );
            if (saved) onClose();
          }}
        >
          <Check aria-hidden="true" /> Add selected
        </Button>
      </footer>
    </section>
  );
}
