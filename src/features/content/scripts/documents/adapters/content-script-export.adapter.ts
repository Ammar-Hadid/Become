import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";
import {
  scriptImageIds,
  scriptPlainText,
  validateScriptDocument,
} from "@/features/content/scripts/utils/content-script-document.util";
import { scriptImageUrl } from "@/features/content/scripts/utils/content-script-url.util";
import {
  createScriptDocx,
  type ScriptExportImage,
  type ScriptExportTypography,
} from "@/features/content/scripts/documents/utils/content-script-docx.util";

function exportTypography(): ScriptExportTypography {
  const probe = document.createElement("span");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  document.body.append(probe);
  try {
    // Derive export sizes from the locked semantic scale rather than inventing
    // a second typography system for documents.
    const sizes = ["text-body-lg", "text-h2", "text-h3", "text-h4"].map(
      (className) => {
        probe.className = className;
        return Math.round(parseFloat(getComputedStyle(probe).fontSize) * 1.5);
      },
    );
    return {
      font: getComputedStyle(document.body)
        .fontFamily.split(",")[0]
        .replace(/["']/g, "")
        .trim(),
      body: sizes[0],
      headings: [sizes[1], sizes[2], sizes[3]],
    };
  } finally {
    probe.remove();
  }
}

async function exportImage(id: string): Promise<ScriptExportImage> {
  const response = await fetch(scriptImageUrl(id), {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(
      "An image could not be loaded. Retry the export when it is available.",
    );
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("This browser could not prepare the document image.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("An image could not be exported.")),
        "image/png",
      ),
    );
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

export async function exportContentScript(
  script: ScriptDocument,
  format: "docx" | "txt",
  title: string,
) {
  validateScriptDocument(script);
  const filename = `${
    title
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .trim()
      .slice(0, 140) || "Script"
  }.${format}`;
  if (format === "txt")
    return {
      filename,
      blob: new Blob([scriptPlainText(script)], {
        type: "text/plain;charset=utf-8",
      }),
    };
  const images = new Map<string, ScriptExportImage>();
  // Bound decoded image memory while producing a portable Word document.
  for (const id of scriptImageIds(script))
    images.set(id, await exportImage(id));
  return {
    filename,
    blob: await createScriptDocx(script, title, exportTypography(), images),
  };
}
