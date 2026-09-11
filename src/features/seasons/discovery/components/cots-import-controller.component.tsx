"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  COTS_COLLECTION_UPDATED_EVENT,
  COTS_IMPORTS_QUEUED_EVENT,
} from "@/features/seasons/discovery/constants/cots-events.constants";

type PendingImportJob = {
  year: number;
  quarter: number;
  selectionId: string;
};

export function CotsImportController() {
  const running = useRef(false);
  const stopped = useRef(false);
  const retryTimer = useRef<number | null>(null);
  const controllers = useRef<AbortController[]>([]);

  const run = useCallback(async () => {
    if (
      running.current ||
      stopped.current ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    )
      return;
    running.current = true;
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    try {
      const response = await fetch("/api/direction/cots?pending=1", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        jobs?: PendingImportJob[];
        nextWakeAt?: string | null;
      } | null;
      if (!response.ok) throw new Error("Pending imports could not be loaded.");
      const jobs = body?.jobs?.slice(0, 2) ?? [];
      if (!jobs.length) {
        const nextWakeAt = body?.nextWakeAt
          ? new Date(body.nextWakeAt).getTime()
          : Number.NaN;
        if (Number.isFinite(nextWakeAt))
          retryTimer.current = window.setTimeout(
            () => window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT)),
            Math.max(250, Math.min(60_000, nextWakeAt - Date.now() + 250)),
          );
        return;
      }

      const imports = await Promise.allSettled(
        jobs.map(async (job) => {
          const controller = new AbortController();
          controllers.current.push(controller);
          try {
            const importResponse = await fetch("/api/direction/cots", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "IMPORT",
                year: job.year,
                quarter: job.quarter,
                selectionId: job.selectionId,
              }),
              signal: controller.signal,
            });
            if (!importResponse.ok)
              throw new Error("A pending import could not be completed.");
          } finally {
            controllers.current = controllers.current.filter(
              (item) => item !== controller,
            );
            window.dispatchEvent(
              new CustomEvent(COTS_COLLECTION_UPDATED_EVENT, {
                detail: { year: job.year, quarter: job.quarter },
              }),
            );
          }
        }),
      );
      retryTimer.current = window.setTimeout(
        () => window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT)),
        imports.some(({ status }) => status === "rejected") ? 5000 : 500,
      );
    } catch {
      retryTimer.current = window.setTimeout(
        () => window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT)),
        5000,
      );
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    stopped.current = false;
    const wake = () => void run();
    window.addEventListener(COTS_IMPORTS_QUEUED_EVENT, wake);
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    void run();
    return () => {
      stopped.current = true;
      window.removeEventListener(COTS_IMPORTS_QUEUED_EVENT, wake);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
      controllers.current.forEach((controller) => controller.abort());
      controllers.current = [];
    };
  }, [run]);

  return null;
}
