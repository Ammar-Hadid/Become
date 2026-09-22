"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useDocumentNavigationGuard({
  flush,
  isBlocking,
  historyKey = "__becomeDocumentEditorGuard",
}: {
  flush: () => Promise<boolean>;
  isBlocking: boolean;
  historyKey?: string;
}) {
  const router = useRouter();
  const armedRef = useRef(false);
  const blockingRef = useRef(isBlocking);
  const flushRef = useRef(flush);
  const navigatingRef = useRef(false);
  const allowUnloadRef = useRef(false);
  const pendingDestinationRef = useRef<string | null>(null);

  useEffect(() => {
    blockingRef.current = isBlocking;
    flushRef.current = flush;
  }, [flush, isBlocking]);

  useEffect(() => {
    if (isBlocking && !armedRef.current && !navigatingRef.current) {
      window.history.pushState(
        { ...window.history.state, [historyKey]: true },
        "",
        window.location.href,
      );
      armedRef.current = true;
    }
  }, [historyKey, isBlocking]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (blockingRef.current && !allowUnloadRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = async (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        navigatingRef.current
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname + destination.search ===
          window.location.pathname + window.location.search
      )
        return;
      if (!blockingRef.current && !armedRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigatingRef.current = true;
      const wasArmed = armedRef.current;
      const canLeave = !blockingRef.current || (await flushRef.current());
      if (!canLeave) {
        navigatingRef.current = false;
        return;
      }
      allowUnloadRef.current = true;
      blockingRef.current = false;
      const href = destination.pathname + destination.search + destination.hash;
      if (wasArmed) {
        pendingDestinationRef.current = href;
        armedRef.current = false;
        window.history.back();
      } else router.push(href);
    };
    const popState = async () => {
      const destination = pendingDestinationRef.current;
      if (destination) {
        pendingDestinationRef.current = null;
        router.replace(destination);
        return;
      }
      if (!armedRef.current || navigatingRef.current) return;
      armedRef.current = false;
      navigatingRef.current = true;
      const canLeave = !blockingRef.current || (await flushRef.current());
      if (canLeave) {
        blockingRef.current = false;
        allowUnloadRef.current = true;
        window.history.back();
        return;
      }
      navigatingRef.current = false;
      window.history.pushState(
        { ...window.history.state, [historyKey]: true },
        "",
        window.location.href,
      );
      armedRef.current = true;
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popState);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popState);
      document.removeEventListener("click", click, true);
    };
  }, [historyKey, router]);
}
