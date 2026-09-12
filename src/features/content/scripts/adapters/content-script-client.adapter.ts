import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import type {
  OwnedScriptImage,
  ScriptSaveRequest,
  ScriptSaveResult,
} from "@/features/content/scripts/types/content-script.types";

export async function saveContentScript(
  contentId: string,
  variantId: string,
  request: ScriptSaveRequest,
): Promise<ScriptSaveResult> {
  const result = await sendContentCommand({
    type: "SAVE_SCRIPT",
    contentId,
    variantId,
    ...request,
  });
  if (result.delivery === "uncertain")
    return {
      kind: "uncertain",
      message:
        result.error ?? "The save could not be confirmed. Retry this draft.",
    };
  if (result.error) {
    if (result.script)
      return { kind: "conflict", message: result.error, latest: result.script };
    return { kind: "rejected", message: result.error };
  }
  if (!result.script)
    return {
      kind: "uncertain",
      message: "Become did not confirm this script. Retry to check the save.",
    };
  return { kind: "saved", script: result.script };
}

export async function uploadScriptImage(
  contentId: string,
  variantId: string,
  file: File,
  operationKey: string,
  signal?: AbortSignal,
): Promise<OwnedScriptImage> {
  const form = new FormData();
  form.set("contentId", contentId);
  form.set("variantId", variantId);
  form.set("operationKey", operationKey);
  form.set("file", file);
  const response = await fetch("/api/content/scripts/images", {
    method: "POST",
    body: form,
    signal,
  });
  const body = await response.json();
  if (!response.ok || !body.image)
    throw new Error(
      body.error ?? "This image could not be uploaded. Try again.",
    );
  return body.image as OwnedScriptImage;
}
