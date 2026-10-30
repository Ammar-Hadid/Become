"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ImagePlus, Move, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { FieldError } from "@/components/ui/forms/field.component";
import "./character-avatar-editor.css";

export type AvatarPlacement = { x: number; y: number; zoom: number };
export const DEFAULT_AVATAR_PLACEMENT: AvatarPlacement = {
  x: 0.5,
  y: 0.5,
  zoom: 1.24,
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function avatarImageStyle(placement: AvatarPlacement) {
  const travel = (placement.zoom - 1) * 100;
  return {
    objectPosition: `${placement.x * 100}% ${placement.y * 100}%`,
    transform: `translate(${(0.5 - placement.x) * travel}%, ${(0.5 - placement.y) * travel}%) scale(${placement.zoom})`,
  };
}

export function CharacterAvatarEditor({
  name,
  source,
  generatedSource,
  placement,
  previewOnly = false,
  persistenceHint,
  onClose,
  onApply,
}: {
  name: string;
  source: string;
  generatedSource: string;
  placement: AvatarPlacement;
  previewOnly?: boolean;
  persistenceHint?: string;
  onClose: () => void;
  onApply: (
    source: string,
    placement: AvatarPlacement,
    file?: File,
  ) => void | boolean | Promise<void | boolean>;
}) {
  const [draftSource, setDraftSource] = useState(source);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPlacement, setDraftPlacement] = useState(placement);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ownedDraftUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (ownedDraftUrlRef.current)
        URL.revokeObjectURL(ownedDraftUrlRef.current);
    };
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
        file.type,
      )
    ) {
      setError("Choose a PNG, JPEG, WebP or AVIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const enoughPixels = bitmap.width >= 512 && bitmap.height >= 512;
      bitmap.close();
      if (!enoughPixels) {
        setError("Choose an image at least 512 pixels wide and tall.");
        return;
      }
      if (ownedDraftUrlRef.current)
        URL.revokeObjectURL(ownedDraftUrlRef.current);
      const url = URL.createObjectURL(file);
      ownedDraftUrlRef.current = url;
      setDraftSource(url);
      setDraftFile(file);
      setDraftPlacement(DEFAULT_AVATAR_PLACEMENT);
      setError("");
    } catch {
      setError("This image could not be opened. Try another file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: draftPlacement.x,
      y: draftPlacement.y,
    };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const available = Math.max(0.15, draftPlacement.zoom - 1);
    setDraftPlacement((current) => ({
      ...current,
      x: clamp(
        drag.x - (event.clientX - drag.pointerX) / (rect.width * available),
      ),
      y: clamp(
        drag.y - (event.clientY - drag.pointerY) / (rect.height * available),
      ),
    }));
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      eyebrow="PORTRAIT PLACEMENT"
      title={`Adjust ${name}'s profile picture`}
      description="Drag to reframe the circle, or fine tune it with the sliders."
      className="character-avatar-dialog"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={applying}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={applying}
            onClick={async () => {
              setApplying(true);
              setError("");
              try {
                const saved = await onApply(
                  draftSource,
                  draftPlacement,
                  draftFile ?? undefined,
                );
                if (saved === false)
                  setError("This picture could not be saved. Try again.");
                else ownedDraftUrlRef.current = null;
              } catch {
                setError("This picture could not be saved. Try again.");
              } finally {
                setApplying(false);
              }
            }}
          >
            {applying ? "Saving picture…" : "Use this picture"}
          </Button>
        </>
      }
    >
      <div className="character-avatar-editor">
        <div
          className="character-avatar-editor-preview"
          role="img"
          aria-label={`${name} profile-picture crop. Drag to position; use the sliders for fine adjustment.`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <Image
            src={draftSource}
            alt=""
            fill
            unoptimized
            sizes="240px"
            style={avatarImageStyle(draftPlacement)}
          />
          <span className="character-avatar-editor-drag-hint type-caption">
            <Move aria-hidden="true" /> Drag to reframe
          </span>
        </div>
        <div className="character-avatar-editor-controls">
          <label className="type-label">
            Zoom
            <input
              type="range"
              min="1.15"
              max="2"
              step="0.01"
              value={draftPlacement.zoom}
              onChange={(event) =>
                setDraftPlacement((current) => ({
                  ...current,
                  zoom: Number(event.target.value),
                }))
              }
            />
          </label>
          <details className="character-avatar-editor-fine-tune">
            <summary className="type-label">Fine tune position</summary>
            <label className="type-label">
              Horizontal position
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(draftPlacement.x * 100)}
                onChange={(event) =>
                  setDraftPlacement((current) => ({
                    ...current,
                    x: Number(event.target.value) / 100,
                  }))
                }
              />
            </label>
            <label className="type-label">
              Vertical position
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(draftPlacement.y * 100)}
                onChange={(event) =>
                  setDraftPlacement((current) => ({
                    ...current,
                    y: Number(event.target.value) / 100,
                  }))
                }
              />
            </label>
          </details>
          <div className="character-avatar-editor-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus aria-hidden="true" /> Upload picture
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraftSource(generatedSource);
                setDraftFile(null);
                setDraftPlacement(DEFAULT_AVATAR_PLACEMENT);
                setError("");
              }}
            >
              <RotateCcw aria-hidden="true" /> Use generated
            </Button>
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            aria-label="Upload profile picture"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
            }}
          />
          {error && <FieldError>{error}</FieldError>}
          <p className="type-caption">
            Square images at least 512 × 512 px work best.
            {persistenceHint
              ? ` ${persistenceHint}`
              : previewOnly
                ? " Your selection is local to this approval preview."
                : " Save the placement to use it in this Season."}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
