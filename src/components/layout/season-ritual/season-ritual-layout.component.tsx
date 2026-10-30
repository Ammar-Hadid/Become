"use client";

import { useEffect, useRef, type ReactNode } from "react";

import "./season-ritual-layout.css";

import { AmbientLight } from "@/components/ui/ambient-light/ambient-light.component";

/** Approved Season ritual shell; feature-owned content and real state are supplied by the caller. */
export function SeasonRitualLayout({
  header,
  introduction,
  children,
  footer,
  split,
  paused,
  contentKey,
}: {
  header: ReactNode;
  introduction: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  split: boolean;
  paused: boolean;
  contentKey: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (split && content.current) content.current.scrollTop = 0;
  }, [contentKey, split]);
  const Body = split ? "main" : "div";
  return (
    <AmbientLight
      paused={paused}
      className="become-season-ritual"
      data-split={split}
    >
      <header className="opening-layout-header">{header}</header>
      <Body
        className="opening-layout-body"
        aria-labelledby={split ? "opening-step-title" : undefined}
      >
        {split && (
          <section
            className="opening-layout-introduction"
            aria-labelledby="opening-step-title"
          >
            {introduction}
          </section>
        )}
        <div
          ref={content}
          className="opening-layout-content"
          id="opening-layout-content"
          role={split ? "region" : undefined}
          aria-label={split ? "Season preparation workspace" : undefined}
          tabIndex={split ? 0 : undefined}
        >
          {children}
        </div>
      </Body>
      {footer && <footer className="opening-layout-footer">{footer}</footer>}
    </AmbientLight>
  );
}
