import type { ContentCommandResult } from "@/features/content/types/content.types";

export type ThumbnailRequest = {
  contentId: string;
  variantId: string;
  expectedMediaVersion: number;
  operationKey: string;
  file: File | null;
};

export type ThumbnailResult = ContentCommandResult & { conflict?: boolean };

export async function saveContentThumbnail(
  request: ThumbnailRequest,
): Promise<ThumbnailResult> {
  try {
    const { file, ...command } = request;
    let response: Response;
    if (file) {
      const body = new FormData();
      body.set("file", file);
      Object.entries(command).forEach(([key, value]) =>
        body.set(key, String(value)),
      );
      response = await fetch("/api/content/media/upload", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(60_000),
      });
    } else {
      const { variantId, ...body } = command;
      response = await fetch(
        `/api/content/media/${encodeURIComponent(variantId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        },
      );
    }
    const body = (await response.json()) as ThumbnailResult;
    if (!body || (body.error !== null && typeof body.error !== "string"))
      throw new Error("Unrecognized thumbnail response");
    if (
      !body.error &&
      (!response.ok ||
        body.workspace?.id !== request.contentId ||
        !body.workspace.variants.some(
          (variant) => variant.id === request.variantId,
        ))
    )
      throw new Error("Thumbnail acknowledgement missing");
    return {
      ...body,
      conflict: response.status === 409,
      delivery: response.status >= 500 ? "uncertain" : "confirmed",
    };
  } catch {
    return {
      error:
        "The thumbnail change could not be confirmed. Retry to check and finish it.",
      delivery: "uncertain",
    };
  }
}
