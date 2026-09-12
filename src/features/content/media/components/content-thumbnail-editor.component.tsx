"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import {
  Check,
  CircleAlert,
  ImagePlus,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { useContentThumbnail } from "@/features/content/media/hooks/use-content-thumbnail.hook";
import { ContentThumbnail } from "@/features/content/shared/components/content-thumbnail.component";
import type {
  ContentWorkspace,
  VariantView,
} from "@/features/content/types/content.types";
import {
  RASTER_IMAGE_ACCEPT,
  RASTER_IMAGE_FORMAT_LABEL,
} from "@/lib/media/constants/raster-image.constants";
import styles from "./content-thumbnail-editor.module.css";

function containsFiles(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.types.includes("Files");
}

export function ContentThumbnailEditor({
  contentId,
  variant,
  contentTitle,
  variantLabel,
  readOnly,
  onWorkspace,
}: {
  contentId: string;
  variant: VariantView;
  contentTitle: string;
  variantLabel: string;
  readOnly: boolean;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [draggingVariantId, setDraggingVariantId] = useState<string | null>(
    null,
  );
  const {
    status,
    error,
    busy,
    success,
    hasPendingFile,
    canRetry,
    canChooseFile,
    upload,
    remove,
    retry,
    showLatest,
    confirmReplacement,
    keepLatest,
  } = useContentThumbnail({
    contentId,
    variant,
    readOnly,
    onWorkspace,
  });
  const hasThumbnail = Boolean(variant.thumbnail);
  const helperId = `content-thumbnail-help-${variant.id}`;
  const contentName = contentTitle.trim() || "Untitled content";
  const manageLabel = `Thumbnail options for ${variantLabel}`;
  const canPickFile = canChooseFile && status !== "review";
  const dragging = draggingVariantId === variant.id && canPickFile;
  const problem =
    status === "error" || status === "conflict" || status === "review";
  const hasDescription = problem || readOnly || (!hasThumbnail && !readOnly);
  const problemText =
    error ||
    (status === "conflict"
      ? "Thumbnail changed elsewhere."
      : status === "review"
        ? "The latest thumbnail is shown."
        : "Become could not change this thumbnail.");
  const canManage = hasThumbnail && !readOnly && !busy && status === "idle";

  function chooseFile() {
    if (canPickFile && !readOnly) inputRef.current?.click();
  }

  function acceptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) upload(file);
  }

  function enterDropTarget(event: DragEvent<HTMLDivElement>) {
    if (!containsFiles(event) || !canPickFile || readOnly) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDraggingVariantId(variant.id);
  }

  function moveOverDropTarget(event: DragEvent<HTMLDivElement>) {
    if (!containsFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canPickFile && !readOnly ? "copy" : "none";
  }

  function leaveDropTarget(event: DragEvent<HTMLDivElement>) {
    if (!dragging) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDraggingVariantId(null);
  }

  function acceptDrop(event: DragEvent<HTMLDivElement>) {
    if (!containsFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDraggingVariantId(null);
    if (!canPickFile || readOnly) return;
    const file = event.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <figure
      className={`content-thumbnail-editor ${styles.editor}`}
      aria-label={`Thumbnail for ${contentName}, ${variantLabel}`}
      data-testid="content-thumbnail-editor"
      data-status={status}
    >
      <figcaption className={styles.captionRow}>
        <span className={styles.caption} title={`Thumbnail · ${variantLabel}`}>
          Thumbnail <span aria-hidden="true">·</span> {variantLabel}
        </span>
        {success && (
          <span
            className={styles.success}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <Check aria-hidden="true" />
            {success === "saved" ? "Saved" : "Removed"}
          </span>
        )}
      </figcaption>

      <div
        className={styles.frame}
        data-dragging={dragging || undefined}
        data-busy={busy || undefined}
        onDragEnter={enterDropTarget}
        onDragOver={moveOverDropTarget}
        onDragLeave={leaveDropTarget}
        onDrop={acceptDrop}
      >
        <ContentThumbnail
          className={
            !hasThumbnail &&
            !readOnly &&
            (status === "idle" || busy || dragging)
              ? styles.emptyThumbnail
              : undefined
          }
          url={variant.thumbnail?.url ?? null}
          alt=""
        />

        {!hasThumbnail &&
          !readOnly &&
          status === "idle" &&
          !busy &&
          !dragging && (
            <button
              type="button"
              className={styles.emptyAction}
              aria-label={`Add thumbnail for ${variantLabel}`}
              aria-describedby={helperId}
              onClick={chooseFile}
            >
              <ImagePlus aria-hidden="true" />
              <span>Add thumbnail</span>
            </button>
          )}

        {(busy || dragging) && (
          <div className={styles.activity} role={busy ? "status" : undefined}>
            {busy ? (
              <span className={styles.pendingDot} aria-hidden="true" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            <span>
              {dragging
                ? "Drop image to upload"
                : status === "removing"
                  ? "Removing…"
                  : "Uploading…"}
            </span>
          </div>
        )}

        {canManage && (
          <div className={styles.manage}>
            <SubMenu
              label={manageLabel}
              placement="bottom-end"
              trigger={(props) => (
                <button {...props} className={styles.manageTrigger}>
                  <MoreHorizontal aria-hidden="true" />
                </button>
              )}
            >
              <MenuItem icon={<ImagePlus />} onSelect={chooseFile}>
                Replace thumbnail
              </MenuItem>
              <MenuItem
                className={styles.removeMenuItem}
                icon={<Trash2 />}
                onSelect={remove}
              >
                Remove thumbnail
              </MenuItem>
            </SubMenu>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={RASTER_IMAGE_ACCEPT}
        tabIndex={-1}
        aria-label={`Choose thumbnail for ${contentName}, ${variantLabel}`}
        aria-describedby={hasDescription ? helperId : undefined}
        disabled={!canPickFile || readOnly}
        onChange={acceptFile}
      />

      <div className={styles.messageArea}>
        {!problem && !readOnly && (
          <p
            id={helperId}
            className={styles.helper}
            data-reserved={hasThumbnail || undefined}
            aria-hidden={hasThumbnail || undefined}
          >
            {RASTER_IMAGE_FORMAT_LABEL} · up to 6 MB
          </p>
        )}

        {!problem && readOnly && (
          <p id={helperId} className={styles.helper}>
            Restore this content or variant to change its thumbnail.
          </p>
        )}

        {problem && (
          <div
            id={helperId}
            className={styles.problem}
            role={
              status === "error" || status === "conflict" ? "alert" : "status"
            }
            aria-live={status === "review" ? "polite" : undefined}
          >
            <span className={styles.problemCopy}>
              <CircleAlert aria-hidden="true" />
              <span>{problemText}</span>
            </span>
            {status === "error" && (
              <span className={styles.problemActions}>
                {canRetry && (
                  <button type="button" onClick={retry}>
                    <RefreshCw aria-hidden="true" /> Retry
                  </button>
                )}
                {canChooseFile && (
                  <button type="button" onClick={chooseFile}>
                    Choose another
                  </button>
                )}
              </span>
            )}
            {status === "conflict" && (
              <span className={styles.problemActions}>
                <button type="button" onClick={showLatest}>
                  Show latest
                </button>
              </span>
            )}
            {status === "review" && (
              <span className={styles.problemActions}>
                <button type="button" onClick={keepLatest}>
                  Keep latest
                </button>
                {!readOnly && (
                  <button type="button" onClick={confirmReplacement}>
                    {hasPendingFile
                      ? "Replace with this image"
                      : "Remove thumbnail"}
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
