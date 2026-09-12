"use client";

import { ImageOff } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  SeasonCharacter,
  SeasonMediaView,
} from "@/features/seasons/types/season.types";
import {
  seasonImageCoverOverflow,
  seasonImagePositionAfterDrag,
  seasonImagePositionAfterNudge,
  type SeasonImageOverflow,
  type SeasonImagePosition,
} from "@/features/seasons/posters/utils/season-image-position.util";

export type SeasonPosterImageEditor = {
  autoFocus?: boolean;
  disabled?: boolean;
  onAvailabilityChange?: (available: boolean) => void;
  onChange: (position: SeasonImagePosition) => void;
  onMovableAxesChange?: (axes: { x: boolean; y: boolean }) => void;
};

function PosterFallback({ character }: { character: SeasonCharacter }) {
  return (
    <div className="season-poster-fallback">
      <span className="season-poster-orbit" aria-hidden="true" />
      <div>
        {character.name ? (
          <>
            <strong>{character.name}</strong>
            <small>{character.sourceWork || "Character selected"}</small>
          </>
        ) : (
          <>
            <ImageOff aria-hidden="true" />
            <strong>Your season, still taking shape</strong>
          </>
        )}
      </div>
    </div>
  );
}

export function SeasonPosterImage({
  poster,
  character,
  position,
  editor,
}: {
  poster?: SeasonMediaView;
  character: SeasonCharacter;
  position?: SeasonImagePosition;
  editor?: SeasonPosterImageEditor;
}) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<SeasonImageOverflow>({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    position: SeasonImagePosition;
    overflow: SeasonImageOverflow;
  } | null>(null);
  const failed = !poster || failedId === poster.id;
  const effectivePosition = position ?? {
    x: poster?.focalX ?? 0.5,
    y: poster?.focalY ?? 0.5,
  };
  const editable = Boolean(editor && poster && !failed);
  const onAvailabilityChange = editor?.onAvailabilityChange;
  const onMovableAxesChange = editor?.onMovableAxesChange;

  useEffect(() => {
    onAvailabilityChange?.(!failed);
  }, [failed, onAvailabilityChange]);

  useEffect(() => {
    if (!editable || !editor?.autoFocus) return;
    const frame = window.requestAnimationFrame(() =>
      editorRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [editable, editor?.autoFocus]);

  useEffect(() => {
    if (!editable || !poster || !editorRef.current) return;
    const element = editorRef.current;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const overflow = seasonImageCoverOverflow(
        bounds.width,
        bounds.height,
        poster.width,
        poster.height,
      );
      overflowRef.current = overflow;
      onMovableAxesChange?.({ x: overflow.x > 0.5, y: overflow.y > 0.5 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [editable, onMovableAxesChange, poster]);

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!editor || editor.disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      position: effectivePosition,
      overflow: overflowRef.current,
    };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!editor || !drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    editor.onChange(
      seasonImagePositionAfterDrag(
        drag.position,
        event.clientX - drag.startX,
        event.clientY - drag.startY,
        drag.overflow,
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !editor ||
      editor.disabled ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const overflow = overflowRef.current;
    if ((horizontal && overflow.x <= 0.5) || (!horizontal && overflow.y <= 0.5))
      return;
    event.preventDefault();
    editor.onChange(
      seasonImagePositionAfterNudge(
        effectivePosition,
        event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
        event.shiftKey,
      ),
    );
  }

  if (failed) {
    return <PosterFallback character={character} />;
  }

  const image = (
    // Authenticated media is served by Become and cannot use the default
    // optimizer because request credentials are not forwarded to loaders.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={poster.href}
      alt={poster.decorative ? "" : poster.alt}
      width={poster.width}
      height={poster.height}
      draggable={false}
      style={{
        objectPosition: `${effectivePosition.x * 100}% ${effectivePosition.y * 100}%`,
      }}
      onError={() => setFailedId(poster.id)}
    />
  );

  if (!editor) return image;

  return (
    <div
      ref={editorRef}
      className="season-poster-image-editor"
      role="group"
      aria-label="Reposition featured image. Drag it or use the arrow keys."
      aria-disabled={editor.disabled || undefined}
      tabIndex={editor.disabled ? -1 : 0}
      autoFocus={editor.autoFocus}
      data-dragging={dragging || undefined}
      onKeyDown={nudge}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {image}
      <span className="season-poster-image-guide" aria-hidden="true" />
      <span className="season-poster-image-label" aria-hidden="true">
        Image position
      </span>
    </div>
  );
}
