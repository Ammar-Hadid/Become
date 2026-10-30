"use client";
import { useId, useState, type RefObject } from "react";
import { Copy, Download, Pause, Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { usePromptClipboard } from "../../image-direction/hooks/use-prompt-clipboard.hook";
import type { ImagePromptPackageView } from "@/features/settings/image-direction/components/image-direction-package-preview.component";
import "../styles/imagery-workspace.css";
export function ImagePromptDrawer({
  open,
  onClose,
  imagePackage,
  busy,
  error,
  onRegenerate,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  imagePackage: ImagePromptPackageView | null;
  busy: boolean;
  error?: string;
  onRegenerate: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const presence = usePresence(open, "surface");
  const [paused, setPaused] = useState(false);
  const clipboard = usePromptClipboard(
    imagePackage?.prompt ?? "",
    `${open}:${imagePackage?.receipt ?? ""}`,
  );
  if (!presence.isPresent) return null;
  return (
    <Drawer
      open={open}
      presenceState={presence.presenceState}
      exiting={presence.isExiting}
      onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      className="imagery-prompt-drawer"
      titleId={`${id}-title`}
      descriptionId={`${id}-description`}
      header={
        <>
          <div className="imagery-prompt-heading">
            <h2 id={`${id}-title`} className="type-widget-title">
              Your image prompt
            </h2>
            <p id={`${id}-description`} className="type-body-sm imagery-muted">
              Saved direction for your approved Season. Copy this exact prompt
              and attach the references in their listed order.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close prompt drawer"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="imagery-error type-body-sm">
          {error}
        </p>
      )}
      {busy && (
        <LoadingIndicator area="direction" label="Writing image prompts" />
      )}
      {imagePackage ? (
        <>
          <div className="imagery-prompt-motion">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={paused}
              aria-controls={`${id}-text`}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {paused ? "Resume motion" : "Pause motion"}
            </Button>
          </div>
          <div className="imagery-prompt-text">
            <AiGeneratedText
              key={`${open}:${imagePackage.receipt}`}
              id={`${id}-text`}
              text={imagePackage.prompt}
              paused={!open || paused}
            />
          </div>
          <div className="imagery-row imagery-prompt-actions">
            <Button
              feedback={{
                state: clipboard.state,
                label: "Copy prompt",
                pendingLabel: "Copying…",
                successLabel: "Copied",
                icon: <Copy aria-hidden="true" />,
              }}
              onClick={() => void clipboard.copy()}
            />
            <Button variant="ghost" disabled={busy} onClick={onRegenerate}>
              <Sparkles aria-hidden="true" />
              Regenerate prompt
            </Button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`type-caption${clipboard.failed ? "imagery-error" : ""}`}
          >
            {clipboard.message}
          </p>
          <div className="imagery-reference-note">
            <p className="type-body-sm">
              Attach reviewed originals first, then approved Season artwork for
              continuity.
            </p>
            <div className="imagery-row">
              {imagePackage.references.map((r, index) => (
                <a key={`${r.kind}:${r.id}`} href={r.href} download>
                  <Download aria-hidden="true" />
                  {index + 1}. {r.kind.replaceAll("-", " ")}
                </a>
              ))}
            </div>
            <p className="type-caption">
              Profile v{imagePackage.profileVersion} · brief v
              {imagePackage.briefRevision} · intent v
              {imagePackage.intentVersion}
            </p>
          </div>
        </>
      ) : (
        !busy && <Button onClick={onRegenerate}>Retry prompt writing</Button>
      )}
    </Drawer>
  );
}
