"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COTS_COLLECTION_UPDATED_EVENT,
  COTS_IMPORTS_QUEUED_EVENT,
} from "@/features/seasons/discovery/constants/cots-events.constants";
import type {
  CotsCandidatePage,
  CotsCandidateView,
  CotsCategory,
  CotsCollectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import type {
  SeasonMediaDraft,
  SeasonQuoteDraft,
} from "@/features/direction/commands/utils/direction-command-client.util";

type DiscoveryKind = "IMAGE" | "TEXT";

type IdentityDraft = {
  displayName: string;
  sourceCategory: CotsCategory;
  sourceWork: string;
  adaptation: string;
  externalId?: string;
  association?: "SAME" | "NEW";
};

type PreflightResult = {
  collection: CotsCollectionView;
  readyPosterId: string | null;
  readyQuoteId: string | null;
  pendingCount: number;
  failedCount: number;
};

type MediaPreferences = Partial<{
  poster: boolean;
  secondary: boolean;
  loading: boolean;
  cadence: boolean;
  retire: boolean;
  focalX: number;
  focalY: number;
}>;

type QuotePreferences = Partial<{
  featured: boolean;
  rotation: boolean;
  retire: boolean;
}>;

const emptyPages: Record<DiscoveryKind, CotsCandidatePage | null> = {
  IMAGE: null,
  TEXT: null,
};

function errorMessage(body: unknown, fallback: string) {
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function appendPage(
  current: CotsCandidatePage | null,
  incoming: CotsCandidatePage,
) {
  if (
    !current ||
    current.identityRevision !== incoming.identityRevision ||
    current.discoveryRevision !== incoming.discoveryRevision ||
    current.queryKey !== incoming.queryKey
  )
    return incoming;

  const refs = new Set(current.items.map(({ candidateRef }) => candidateRef));
  return {
    ...incoming,
    items: [
      ...current.items,
      ...incoming.items.filter(({ candidateRef }) => !refs.has(candidateRef)),
    ],
    sources: incoming.sources,
  };
}

export function useCotsCollection(year: number, quarter: number) {
  const [collection, setCollectionState] = useState<CotsCollectionView | null>(
    null,
  );
  const collectionRef = useRef<CotsCollectionView | null>(null);
  const [pages, setPages] = useState(emptyPages);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [discovering, setDiscovering] = useState<DiscoveryKind | null>(null);
  const [pendingCandidateRefs, setPendingCandidateRefs] = useState<Set<string>>(
    new Set(),
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discoveryAbort = useRef<Record<DiscoveryKind, AbortController | null>>({
    IMAGE: null,
    TEXT: null,
  });
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const collectionGeneration = useRef(0);
  const refreshSequence = useRef(0);

  const setCollection = useCallback((next: CotsCollectionView) => {
    collectionRef.current = next;
    setCollectionState(next);
  }, []);

  const refreshCollection = useCallback(async () => {
    const requestSequence = ++refreshSequence.current;
    const generation = collectionGeneration.current;
    try {
      const response = await fetch(
        `/api/direction/cots?year=${year}&quarter=${quarter}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok)
        throw new Error(
          errorMessage(body, "This season’s collection could not be loaded."),
        );
      if (
        requestSequence !== refreshSequence.current ||
        generation !== collectionGeneration.current
      )
        return;
      setCollection(body as CotsCollectionView);
      setError(null);
    } catch (cause) {
      if (
        requestSequence === refreshSequence.current &&
        generation === collectionGeneration.current
      )
        setError(
          cause instanceof Error
            ? cause.message
            : "This season’s collection could not be loaded.",
        );
    } finally {
      if (requestSequence === refreshSequence.current)
        setLoadingCollection(false);
    }
  }, [quarter, setCollection, year]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCollection(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshCollection]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ year?: number; quarter?: number }>)
        .detail;
      if (detail && (detail.year !== year || detail.quarter !== quarter))
        return;
      void refreshCollection();
    };
    window.addEventListener(COTS_COLLECTION_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(COTS_COLLECTION_UPDATED_EVENT, refresh);
  }, [quarter, refreshCollection, year]);

  useEffect(
    () => () => {
      discoveryAbort.current.IMAGE?.abort();
      discoveryAbort.current.TEXT?.abort();
    },
    [],
  );

  const post = useCallback(
    async (payload: Record<string, unknown>, signal?: AbortSignal) => {
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ year, quarter, ...payload }),
        signal,
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok)
        throw new Error(errorMessage(body, "That change could not be saved."));
      return body;
    },
    [quarter, year],
  );

  const saveIdentity = useCallback(
    async (draft: IdentityDraft) => {
      collectionGeneration.current += 1;
      setPendingAction("identity");
      setError(null);
      try {
        const current = collectionRef.current;
        const next = (await post({
          action: "IDENTITY",
          ...draft,
          expectedIdentityRevision: current?.identity?.identityRevision ?? 0,
        })) as CotsCollectionView;
        setCollection(next);
        setPages(emptyPages);
        return next;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "This identity could not be saved.",
        );
        return null;
      } finally {
        collectionGeneration.current += 1;
        setPendingAction(null);
      }
    },
    [post, setCollection],
  );

  const discover = useCallback(
    async (kind: DiscoveryKind, append = false) => {
      const identity = collectionRef.current?.identity;
      if (!identity) return null;
      discoveryAbort.current[kind]?.abort();
      const controller = new AbortController();
      discoveryAbort.current[kind] = controller;
      setDiscovering(kind);
      setError(null);
      try {
        const currentPage = pages[kind];
        const page = (await post(
          {
            action: "DISCOVER",
            kind,
            identityRevision: identity.identityRevision,
            discoveryRevision: identity.discoveryRevision,
            ...(append && currentPage?.nextCursor
              ? { cursor: currentPage.nextCursor }
              : {}),
          },
          controller.signal,
        )) as CotsCandidatePage;
        const currentIdentity = collectionRef.current?.identity;
        if (
          !currentIdentity ||
          currentIdentity.id !== identity.id ||
          page.identityRevision !== currentIdentity.identityRevision ||
          page.discoveryRevision !== currentIdentity.discoveryRevision
        )
          return null;
        setPages((current) => ({
          ...current,
          [kind]: appendPage(append ? current[kind] : null, page),
        }));
        return page;
      } catch (cause) {
        if ((cause as { name?: string })?.name !== "AbortError")
          setError(
            cause instanceof Error
              ? cause.message
              : "Become could not look for more inspiration.",
          );
        return null;
      } finally {
        if (discoveryAbort.current[kind] === controller) {
          discoveryAbort.current[kind] = null;
          setDiscovering(null);
        }
      }
    },
    [pages, post],
  );

  const queueCollectionMutation = useCallback(
    <T>(
      actionName: string,
      createPayload: (current: CotsCollectionView) => Record<string, unknown>,
      after?: (body: T) => void,
    ) => {
      let resolveResult: (value: T | null) => void;
      const result = new Promise<T | null>((resolve) => {
        resolveResult = resolve;
      });
      mutationQueue.current = mutationQueue.current.then(async () => {
        const current = collectionRef.current;
        if (!current) {
          resolveResult(null);
          return;
        }
        collectionGeneration.current += 1;
        setPendingAction(actionName);
        setError(null);
        try {
          const body = (await post(createPayload(current))) as T;
          if (body && typeof body === "object" && "selectionRevision" in body)
            setCollection(body as unknown as CotsCollectionView);
          after?.(body);
          resolveResult(body);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "That collection change could not be saved.",
          );
          resolveResult(null);
        } finally {
          collectionGeneration.current += 1;
          setPendingAction(null);
        }
      });
      return result;
    },
    [post, setCollection],
  );

  const selectCandidate = useCallback(
    (candidate: CotsCandidateView, selected: boolean) => {
      setPendingCandidateRefs((current) =>
        new Set(current).add(candidate.candidateRef),
      );
      const result = queueCollectionMutation<CotsCollectionView>(
        `select:${candidate.candidateRef}`,
        (current) => ({
          action: "SELECT",
          candidateRef: candidate.candidateRef,
          selected,
          expectedSelectionRevision: current.selectionRevision,
        }),
      );
      void result.finally(() =>
        setPendingCandidateRefs((current) => {
          const next = new Set(current);
          next.delete(candidate.candidateRef);
          return next;
        }),
      );
      return result;
    },
    [queueCollectionMutation],
  );

  const confirmSelections = useCallback(
    (desiredPosterSelectionId?: string, desiredQuoteSelectionId?: string) =>
      queueCollectionMutation<CotsCollectionView>(
        "confirm",
        (current) => ({
          action: "CONFIRM",
          expectedSelectionRevision: current.selectionRevision,
          ...(desiredPosterSelectionId ? { desiredPosterSelectionId } : {}),
          ...(desiredQuoteSelectionId ? { desiredQuoteSelectionId } : {}),
        }),
        () => window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT)),
      ),
    [queueCollectionMutation],
  );

  const retrySelection = useCallback(
    (selectionId: string) =>
      queueCollectionMutation<CotsCollectionView>(
        `retry:${selectionId}`,
        () => ({ action: "RETRY", selectionId }),
        () => window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT)),
      ),
    [queueCollectionMutation],
  );

  const preflight = useCallback(
    (beginWithCurrentPoster = false) =>
      queueCollectionMutation<PreflightResult>(
        "preflight",
        () => ({ action: "PREFLIGHT", beginWithCurrentPoster }),
        (body) => setCollection(body.collection),
      ),
    [queueCollectionMutation, setCollection],
  );

  const addManualImage = useCallback(
    async (file: File, draft: SeasonMediaDraft, operationKey: string) => {
      const current = collectionRef.current;
      if (!current) return null;
      collectionGeneration.current += 1;
      setPendingAction("manual-image");
      setError(null);
      try {
        const body = new FormData();
        body.set("file", file);
        body.set(
          "input",
          JSON.stringify({
            year,
            quarter,
            operationKey,
            expectedSelectionRevision: current.selectionRevision,
            draft,
          }),
        );
        const response = await fetch("/api/direction/cots/upload", {
          method: "POST",
          body,
        });
        const result = (await response.json().catch(() => null)) as unknown;
        if (!response.ok)
          throw new Error(
            errorMessage(result, "The image could not be uploaded."),
          );
        setCollection(result as CotsCollectionView);
        return result as CotsCollectionView;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The image could not be uploaded.",
        );
        return null;
      } finally {
        collectionGeneration.current += 1;
        setPendingAction(null);
      }
    },
    [quarter, setCollection, year],
  );

  const addManualText = useCallback(
    (draft: SeasonQuoteDraft, operationKey: string) =>
      queueCollectionMutation<CotsCollectionView>("manual-text", (current) => ({
        action: "MANUAL_TEXT",
        operationKey,
        expectedSelectionRevision: current.selectionRevision,
        draft,
      })),
    [queueCollectionMutation],
  );

  const reuseImage = useCallback(
    (mediaId: string, poster = false) =>
      queueCollectionMutation<CotsCollectionView>("reuse-image", (current) => ({
        action: "REUSE_IMAGE",
        mediaId,
        poster,
        expectedSelectionRevision: current.selectionRevision,
      })),
    [queueCollectionMutation],
  );

  const updateMediaPreferences = useCallback(
    (mediaId: string, preferences: MediaPreferences) =>
      queueCollectionMutation<CotsCollectionView>(
        `media-preferences:${mediaId}`,
        (current) => ({
          action: "MEDIA_PREFERENCES",
          mediaId,
          ...preferences,
          expectedSelectionRevision: current.selectionRevision,
        }),
      ),
    [queueCollectionMutation],
  );

  const updateQuotePreferences = useCallback(
    (quoteId: string, preferences: QuotePreferences) =>
      queueCollectionMutation<CotsCollectionView>(
        `quote-preferences:${quoteId}`,
        (current) => ({
          action: "QUOTE_PREFERENCES",
          quoteId,
          ...preferences,
          expectedSelectionRevision: current.selectionRevision,
        }),
      ),
    [queueCollectionMutation],
  );

  return {
    collection,
    pages,
    loadingCollection,
    discovering,
    pendingCandidateRefs,
    pendingAction,
    error,
    setError,
    refreshCollection,
    saveIdentity,
    discover,
    selectCandidate,
    confirmSelections,
    retrySelection,
    preflight,
    addManualImage,
    addManualText,
    reuseImage,
    updateMediaPreferences,
    updateQuotePreferences,
  };
}
