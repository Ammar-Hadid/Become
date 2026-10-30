"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import {
  RASTER_IMAGE_ACCEPT,
  RASTER_IMAGE_CONTENT_TYPES,
  RASTER_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/media/constants/raster-image.constants";
import "./artwork-upload.css";
export type ArtworkUploadAsset = {
  href: string;
  filename: string;
  width: number;
  height: number;
};

/** Approved artwork upload presentation. The feature validates and persists the raw file. */
export function ArtworkUpload({
  label,
  specification,
  asset,
  disabled,
  onUpload,
  onPrompt,
  promptReady,
  promptBusy,
}: {
  label: string;
  specification: string;
  asset?: ArtworkUploadAsset;
  disabled?: boolean;
  promptReady: boolean;
  promptBusy?: boolean;
  onUpload: (file: File) => Promise<void>;
  onPrompt: (trigger: HTMLButtonElement) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const busy = disabled || uploading;
  async function upload(file?: File) {
    if (!file || locked.current || disabled) return;
    locked.current = true;
    setUploading(true);
    setError("");
    try {
      if (
        !RASTER_IMAGE_CONTENT_TYPES.has(file.type) ||
        !file.size ||
        file.size > RASTER_IMAGE_MAX_UPLOAD_BYTES
      )
        throw new Error(
          "Choose a still JPEG, PNG, WebP or AVIF image up to 6 MB.",
        );
      await onUpload(file);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Upload failed. Try again.",
      );
    } finally {
      locked.current = false;
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Card
      spacing="action"
      material="solid"
      className="become-artwork-upload"
      data-dragging={dragging}
    >
      <header className="artwork-upload-header">
        <h3 className="type-widget-title" id={`${id}-label`}>
          {label}
        </h3>
        {asset && (
          <span className="type-caption artwork-upload-success">
            <Check aria-hidden="true" /> Uploaded
          </span>
        )}
      </header>
      <div className="artwork-upload-target" data-filled={Boolean(asset)}>
        <button
          type="button"
          className="artwork-upload-drop"
          aria-label={`${asset ? "Replace" : "Upload"} ${label.toLowerCase()}`}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length !== 1)
              setError("Drop one image into this composition.");
            else void upload(event.dataTransfer.files[0]);
          }}
        >
          {asset ? (
            <Image
              src={asset.href}
              alt={`${label} · uploaded preview`}
              fill
              unoptimized
              sizes="(max-width: 1023px) 100vw, 33vw"
            />
          ) : (
            <span className="artwork-upload-empty">
              <ImagePlus aria-hidden="true" />
              <strong className="type-body">Drop your image here</strong>
              <span className="type-caption">or choose a file</span>
            </span>
          )}
          {asset && (
            <span className="artwork-upload-replace type-label">
              <Upload aria-hidden="true" /> Replace image
            </span>
          )}
        </button>
        <input
          ref={input}
          type="file"
          accept={RASTER_IMAGE_ACCEPT}
          hidden
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <p id={`${id}-help`} className="type-caption">
        {specification} · JPEG, PNG, WebP or AVIF · up to 6 MB
      </p>
      {asset && (
        <p className="type-caption artwork-upload-file">
          {asset.filename} · {asset.width} × {asset.height}
        </p>
      )}
      {uploading && (
        <LoadingIndicator
          area="direction"
          label={`Saving ${label.toLowerCase()} for review`}
        />
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="artwork-upload-error type-body-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button
        variant={promptReady ? "ghost" : "secondary"}
        disabled={busy || promptBusy}
        onClick={(event) => onPrompt(event.currentTarget)}
      >
        {promptBusy
          ? "Preparing prompts…"
          : promptReady
            ? "View & copy prompt"
            : "Generate prompt"}
      </Button>
    </Card>
  );
}
