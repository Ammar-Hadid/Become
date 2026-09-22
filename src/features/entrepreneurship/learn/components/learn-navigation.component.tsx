"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  BookOpenText,
  MessageSquareText,
  NotebookPen,
  SearchCheck,
} from "lucide-react";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

const destinations = [
  ["conversations", "Conversations", MessageSquareText],
  ["observations", "Observations", NotebookPen],
  ["sources", "Sources", SearchCheck],
  ["guides", "Guides", BookOpenText],
] as const;

export function LearnNavigation({
  nicheId,
  active,
}: {
  nicheId: string;
  active?: (typeof destinations)[number][0];
}) {
  const currentLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentLink.current?.scrollIntoView({
      behavior: "instant",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  return (
    <nav className="exploration-local-navigation" aria-label="Learn workspace">
      {destinations.map(([slug, label, Icon]) => (
        <Link
          ref={slug === active ? currentLink : undefined}
          key={slug}
          href={explorationHref(nicheId, `/learn/${slug}`)}
          aria-current={slug === active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
