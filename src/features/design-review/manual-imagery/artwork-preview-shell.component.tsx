"use client";

import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { AmbientLight } from "@/components/ui/ambient-light/ambient-light.component";
import { Button } from "@/components/ui/buttons/button.component";
import "./manual-imagery-candidate.css";

export function ArtworkPreviewShell({
  children,
  library = false,
  status,
  footer,
}: {
  children: ReactNode;
  library?: boolean;
  status: string;
  footer?: ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <AmbientLight paused={paused} className="artwork-preview-shell">
      <header className="artwork-preview-header">
        <BrandMark />
        <nav aria-label="Artwork review pages" className="imagery-row">
          <Link
            href="/manual-season-imagery-candidate"
            aria-current={!library ? "page" : undefined}
          >
            Manual imagery
          </Link>
          <Link
            href="/image-prompt-library-candidate"
            aria-current={library ? "page" : undefined}
          >
            Prompt library
          </Link>
        </nav>
        <div className="imagery-row">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {paused ? "Resume motion" : "Pause motion"}
          </Button>
          <span className="type-caption" role="status">
            {status}
          </span>
        </div>
      </header>
      <div className="artwork-preview-content">{children}</div>
      <footer className="artwork-preview-footer">
        {footer}
        <p className="type-caption">
          Interactive review · sample character and prompts · no AI calls or
          Season changes
        </p>
      </footer>
    </AmbientLight>
  );
}
