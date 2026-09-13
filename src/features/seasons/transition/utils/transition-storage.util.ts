import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";

export function transitionStorageKey(view: SeasonTransitionView) {
  return `become:season-transition:${view.storageScope}`;
}

export function suppressAutomaticTransition(
  view: SeasonTransitionView,
  notice?: string,
) {
  try {
    window.sessionStorage.setItem(
      transitionStorageKey(view),
      JSON.stringify({ suppressed: true, notice: notice ?? null }),
    );
  } catch {
    /* The Home return query also prevents immediate automatic entry. */
  }
  window.dispatchEvent(new Event("become:season-transition-suppressed"));
}

export function readTransitionSuppression(view: SeasonTransitionView): {
  suppressed: boolean;
  notice: string | null;
} {
  try {
    const raw = window.sessionStorage.getItem(transitionStorageKey(view));
    if (!raw) return { suppressed: false, notice: null };
    const value = JSON.parse(raw) as { suppressed?: unknown; notice?: unknown };
    return {
      suppressed: value.suppressed === true,
      notice: typeof value.notice === "string" ? value.notice : null,
    };
  } catch {
    return { suppressed: false, notice: null };
  }
}

export function clearTransitionSuppression(view: SeasonTransitionView) {
  try {
    window.sessionStorage.removeItem(transitionStorageKey(view));
  } catch {
    /* Backend disposition remains authoritative. */
  }
}
