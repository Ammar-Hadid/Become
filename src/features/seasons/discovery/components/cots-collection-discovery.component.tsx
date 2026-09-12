"use client";

import { Check, ImagePlus, Quote, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { CotsImageRail } from "@/features/seasons/discovery/components/cots-image-rail.component";
import { CotsManualEntry } from "@/features/seasons/discovery/components/cots-manual-entry.component";
import { CotsWordDeck } from "@/features/seasons/discovery/components/cots-word-deck.component";
import { useCotsCollection } from "@/features/seasons/discovery/hooks/use-cots-collection.hook";
import type {
  SeasonQuoteView,
  SeasonView,
} from "@/features/seasons/types/season.types";
import "@/features/seasons/discovery/styles/cots-discovery.css";

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
    updateQuotePreferences,
  } = useCotsCollection(season.year, season.quarter);
  const [kind, setKind] = useState<"IMAGE" | "TEXT">("IMAGE");
  const [editingManualQuote, setEditingManualQuote] =
    useState<SeasonQuoteView | null>(null);
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
  const selectedCount = selections.filter(
    ({ status }) => status === "SELECTED",
  ).length;

  useEffect(() => {
    if (collection?.identity && !page && !discovering[kind])
      void discover(kind);
  }, [collection?.identity, discover, discovering, kind, page]);

  async function removeManualQuote(quote: SeasonQuoteView) {
    const saved = await updateQuotePreferences(quote.id, { retire: true });
    if (!saved) return;
    setEditingManualQuote((current) =>
      current?.id === quote.id ? null : current,
    );
    router.refresh();
  }

  return (
    <section
      className="cots-collection-discovery"
      aria-labelledby="cots-collection-discovery-title"
    >
      <header>
        <div>
          <p className="eyebrow">Discover more</p>
          <h3 id="cots-collection-discovery-title">
            Find another piece of this season.
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
            discovering={discovering.IMAGE}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(id) => void retrySelection(id)}
            onRetryDiscovery={() => void discover("IMAGE")}
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
        </>
      ) : (
        <>
          <CotsWordDeck
            page={pages.TEXT}
            selections={selections}
            savedQuotes={season.quotes.filter(
              ({ provenance }) => provenance.origin === "MANUAL",
            )}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering.TEXT}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(id) => void retrySelection(id)}
            onRetryDiscovery={() => void discover("TEXT")}
            onLoadMore={() => void discover("TEXT", true)}
            savedQuotePending={Boolean(pendingAction)}
            onEditSavedQuote={setEditingManualQuote}
            onRemoveSavedQuote={(quote) => void removeManualQuote(quote)}
          />
          <CotsManualEntry
            key={editingManualQuote?.id ?? "manual-text-entry"}
            kind="text"
            disabled={Boolean(pendingAction)}
            editingText={editingManualQuote}
            onCancelTextEdit={() => setEditingManualQuote(null)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey, quoteId) =>
              addManualText(draft, operationKey, quoteId).then((saved) => {
                if (saved) {
                  setEditingManualQuote(null);
                  router.refresh();
                }
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
            const saved = await confirmSelections();
            if (saved) onClose();
          }}
        >
          <Check aria-hidden="true" /> Add selected
        </Button>
      </footer>
    </section>
  );
}
