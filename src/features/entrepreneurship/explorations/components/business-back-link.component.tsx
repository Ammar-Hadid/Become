"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  contextualBusinessHref,
  explorationHref,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

function safeReturnTo(value: string | undefined, nicheId: string | undefined) {
  if (!value || !nicheId) return null;
  let url: URL;
  try {
    url = new URL(value, "http://become.local");
  } catch {
    return null;
  }
  if (url.origin !== "http://become.local") return null;
  const base = explorationHref(nicheId);
  if (!url.pathname.startsWith(base)) return null;
  const boundary = url.pathname.charAt(base.length);
  return !boundary || boundary === "/" || boundary === "?" || boundary === "#"
    ? `${url.pathname}${url.search}${url.hash}`
    : null;
}

export function BusinessBackLink({
  returnTo,
  fallbackHref,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  returnTo?: string;
  fallbackHref: string;
}) {
  const exploration = useExploration();
  return (
    <Link
      {...props}
      href={
        safeReturnTo(returnTo, exploration?.id) ??
        contextualBusinessHref(fallbackHref, exploration?.id)
      }
    />
  );
}
