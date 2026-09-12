"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RASTER_IMAGE_CONTENT_TYPES,
  RASTER_IMAGE_FORMAT_LABEL,
  RASTER_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/media/constants/raster-image.constants";
import {
  saveContentThumbnail,
  type ThumbnailRequest,
} from "@/features/content/media/adapters/content-thumbnail-client.adapter";
import type {
  ContentWorkspace,
  VariantView,
} from "@/features/content/types/content.types";

type ThumbnailState = {
  status: "idle" | "uploading" | "removing" | "error" | "conflict" | "review";
  error: string | null;
  success: "saved" | "removed" | null;
  attempt: ThumbnailRequest | null;
  uncertain: boolean;
  latest: ContentWorkspace | null;
};

const idle: ThumbnailState = {
  status: "idle",
  error: null,
  success: null,
  attempt: null,
  uncertain: false,
  latest: null,
};

export function useContentThumbnail({
  contentId,
  variant,
  readOnly = false,
  onWorkspace,
}: {
  contentId: string;
  variant: VariantView;
  readOnly?: boolean;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, ThumbnailState>>({});
  // The ref makes rapid clicks synchronous; render state keeps each variant's
  // status separate without unmounting or losing its retained File on a tab switch.
  const entries = useRef(new Map<string, ThumbnailState>());
  const versions = useRef(new Map<string, number>());
  const current = states[variant.id] ?? idle;
  const busy = current.status === "uploading" || current.status === "removing";

  function update(id: string, state: ThumbnailState) {
    entries.current.set(id, state);
    setStates((previous) => ({ ...previous, [id]: state }));
  }

  function accept(workspace: ContentWorkspace) {
    workspace.variants.forEach((item) => {
      versions.current.set(
        item.id,
        Math.max(item.mediaVersion, versions.current.get(item.id) ?? 0),
      );
    });
    onWorkspace(workspace);
  }

  async function perform(attempt: ThumbnailRequest) {
    const active = entries.current.get(attempt.variantId);
    if (active?.status === "uploading" || active?.status === "removing") return;
    update(attempt.variantId, {
      ...idle,
      status: attempt.file ? "uploading" : "removing",
      attempt,
    });
    const result = await saveContentThumbnail(attempt);
    if (result.delivery === "uncertain") {
      update(attempt.variantId, {
        ...idle,
        status: "error",
        attempt,
        uncertain: true,
        error:
          result.error ??
          "The thumbnail change could not be confirmed. Retry to finish it.",
      });
    } else if (result.conflict && result.workspace) {
      update(attempt.variantId, {
        ...idle,
        status: "conflict",
        attempt,
        latest: result.workspace,
        error: "Thumbnail changed elsewhere.",
      });
    } else if (result.error) {
      update(attempt.variantId, {
        ...idle,
        status: "error",
        attempt,
        error: result.error,
      });
    } else {
      if (result.workspace) accept(result.workspace);
      update(attempt.variantId, {
        ...idle,
        success: attempt.file ? "saved" : "removed",
      });
      // Refresh the client route cache as well as the server-revalidated Content desk.
      router.refresh();
    }
  }

  function canStart() {
    const state = entries.current.get(variant.id) ?? idle;
    return (
      !readOnly &&
      !variant.archivedAt &&
      !state.uncertain &&
      !["uploading", "removing", "conflict"].includes(state.status)
    );
  }

  function start(file: File | null) {
    if (!canStart()) return;
    void perform({
      contentId,
      variantId: variant.id,
      file,
      expectedMediaVersion: Math.max(
        variant.mediaVersion,
        versions.current.get(variant.id) ?? 0,
      ),
      operationKey: crypto.randomUUID(),
    });
  }

  function upload(file: File) {
    if (!canStart()) return;
    let error: string | null = null;
    if (!file.size || file.size > RASTER_IMAGE_MAX_UPLOAD_BYTES)
      error = "Choose an image up to 6 MB.";
    else if (file.type && !RASTER_IMAGE_CONTENT_TYPES.has(file.type))
      error = `Choose a still ${RASTER_IMAGE_FORMAT_LABEL} image.`;
    if (error) {
      update(variant.id, { ...idle, status: "error", error });
      return;
    }
    start(file);
  }

  function retry() {
    const state = entries.current.get(variant.id);
    if (
      readOnly ||
      variant.archivedAt ||
      state?.status !== "error" ||
      !state.attempt
    )
      return;
    void perform(
      state.uncertain
        ? state.attempt
        : {
            ...state.attempt,
            operationKey: crypto.randomUUID(),
          },
    );
  }

  function showLatest() {
    const state = entries.current.get(variant.id);
    if (state?.status !== "conflict" || !state.latest) return;
    accept(state.latest);
    update(variant.id, { ...state, status: "review", error: null });
  }

  function confirmReplacement() {
    const state = entries.current.get(variant.id);
    if (!canStart() || state?.status !== "review" || !state.attempt) return;
    start(state.attempt.file);
  }

  function keepLatest() {
    if (entries.current.get(variant.id)?.status === "review")
      update(variant.id, idle);
  }

  return {
    status: current.status,
    error: current.error,
    success: current.success,
    busy,
    hasPendingFile: Boolean(current.attempt?.file),
    canRetry:
      !readOnly &&
      !variant.archivedAt &&
      current.status === "error" &&
      Boolean(current.attempt),
    canChooseFile:
      !readOnly &&
      !variant.archivedAt &&
      !busy &&
      !current.uncertain &&
      current.status !== "conflict",
    upload,
    remove: () => {
      if (variant.thumbnail) start(null);
    },
    retry,
    showLatest,
    confirmReplacement,
    keepLatest,
  };
}
