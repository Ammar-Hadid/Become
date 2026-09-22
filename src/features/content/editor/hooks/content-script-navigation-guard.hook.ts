"use client";

import { useDocumentNavigationGuard } from "@/components/ui/document-editor/hooks/document-navigation-guard.hook";

/** Content compatibility wrapper for the shared editor navigation lifecycle. */
export function useContentScriptNavigationGuard({
  flush,
  isBlocking,
}: {
  flush: () => Promise<boolean>;
  isBlocking: boolean;
}) {
  useDocumentNavigationGuard({
    flush,
    isBlocking,
    historyKey: "__becomeContentScriptGuard",
  });
}
