"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalLayers: symbol[] = [];
let scrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let rootReturnFocus: HTMLElement | null = null;

function lockDocumentScroll() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const parsedPadding = Number.parseFloat(
        window.getComputedStyle(document.body).paddingRight,
      );
      const currentPadding = Number.isFinite(parsedPadding) ? parsedPadding : 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockDocumentScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  document.body.style.overflow = previousBodyOverflow;
  document.body.style.paddingRight = previousBodyPaddingRight;
}

function removeModalLayer(layerId: symbol) {
  const index = modalLayers.lastIndexOf(layerId);
  if (index >= 0) modalLayers.splice(index, 1);
}

function isTopModalLayer(layerId: symbol) {
  return modalLayers.at(-1) === layerId;
}

function canReceiveFocus(element: HTMLElement) {
  if (element.closest('[inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

export function useModalLayer({
  open,
  containerRef,
  initialFocusRef,
  returnFocusRef,
  onClose,
}: {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const layerIdRef = useRef(Symbol("modal-layer"));
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const layerId = layerIdRef.current;
    const previouslyFocused = returnFocusRef?.current ?? document.activeElement;
    if (modalLayers.length === 0) {
      rootReturnFocus =
        previouslyFocused instanceof HTMLElement ? previouslyFocused : null;
    }
    modalLayers.push(layerId);
    lockDocumentScroll();

    const focusableElements = () =>
      Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        ) ?? [],
      ).filter(canReceiveFocus);

    const focusFrame = window.requestAnimationFrame(() => {
      if (!isTopModalLayer(layerId)) return;
      const initialFocus = initialFocusRef?.current ?? focusableElements()[0];
      initialFocus?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModalLayer(layerId)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusableElements();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        containerRef.current?.focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      const wasTopLayer = isTopModalLayer(layerId);
      removeModalLayer(layerId);
      unlockDocumentScroll();
      if (wasTopLayer) {
        const returnTarget =
          previouslyFocused instanceof HTMLElement &&
          previouslyFocused.isConnected
            ? previouslyFocused
            : modalLayers.length === 0 && rootReturnFocus?.isConnected
              ? rootReturnFocus
              : null;
        returnTarget?.focus({ preventScroll: true });
      }
      if (modalLayers.length === 0) rootReturnFocus = null;
    };
  }, [containerRef, initialFocusRef, open, returnFocusRef]);
}
