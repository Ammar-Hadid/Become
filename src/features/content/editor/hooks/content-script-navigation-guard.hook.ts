"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const HISTORY_GUARD_KEY = "__becomeContentScriptGuard";

export function useContentScriptNavigationGuard({
  flush,
  isBlocking,
}: {
  flush: () => Promise<boolean>;
  isBlocking: boolean;
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
        { ...window.history.state, [HISTORY_GUARD_KEY]: true },
        "",
        window.location.href,
      );
      armedRef.current = true;
    }
  }, [isBlocking]);

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
      if (wasArmed) {
        pendingDestinationRef.current =
          destination.pathname + destination.search + destination.hash;
        armedRef.current = false;
        window.history.back();
      } else {
        router.push(
          destination.pathname + destination.search + destination.hash,
        );
      }
    };

    const popState = async () => {
      const pendingDestination = pendingDestinationRef.current;
      if (pendingDestination) {
        pendingDestinationRef.current = null;
        router.replace(pendingDestination);
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
        { ...window.history.state, [HISTORY_GUARD_KEY]: true },
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
  }, [router]);
}
