import { generateJSON } from "@tiptap/core";
import { getScriptExtensions } from "@/features/content/scripts/config/content-script-editor.config";
import { SCRIPT_MAX_IMPORT_BYTES } from "@/features/content/scripts/constants/content-script.constants";
import type {
  OwnedScriptImage,
  ScriptImportResult,
} from "@/features/content/scripts/types/content-script.types";
import {
  scriptDocumentFromText,
  validateScriptDocument,
} from "@/features/content/scripts/utils/content-script-document.util";
import { isScriptLinkAllowed } from "@/features/content/scripts/utils/content-script-url.util";
import { checkScriptDocxArchive } from "@/features/content/scripts/documents/utils/content-script-import.util";

export async function importContentScript(
  file: File,
  upload: (
    file: File,
    operationKey: string,
    signal?: AbortSignal,
  ) => Promise<OwnedScriptImage>,
  signal?: AbortSignal,
): Promise<ScriptImportResult> {
  signal?.throwIfAborted();
  if (file.size > SCRIPT_MAX_IMPORT_BYTES)
    throw new Error("Choose a document up to 10 MB.");
  if (/\.txt$/i.test(file.name)) {
    const text = await file.text();
    signal?.throwIfAborted();
    return {
      document: validateScriptDocument(scriptDocumentFromText(text)),
      warnings: [],
    };
  }
  if (!/\.docx$/i.test(file.name))
    throw new Error("Choose a DOCX or plain-text (.txt) document.");
  const arrayBuffer = await file.arrayBuffer();
  checkScriptDocxArchive(arrayBuffer);
  const [{ default: mammoth }, { default: DOMPurify }] = await Promise.all([
    import("mammoth"),
    import("dompurify"),
  ]);
  const warnings = new Set<string>();
  const ownedImages = new Map<string, OwnedScriptImage>();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      externalFileAccess: false,
      includeEmbeddedStyleMap: false,
      ignoreEmptyParagraphs: false,
      styleMap: [
        "u => u",
        "strike => s",
        "p[style-name='Heading 4'] => h3:fresh",
        "p[style-name='Heading 5'] => h3:fresh",
        "p[style-name='Heading 6'] => h3:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        signal?.throwIfAborted();
        const data = await image.readAsArrayBuffer();
        const uploaded = await upload(
          new File([data], "document-image", { type: image.contentType }),
          crypto.randomUUID(),
          signal,
        );
        ownedImages.set(uploaded.url, uploaded);
        return { src: uploaded.url };
      }),
    },
  );
  signal?.throwIfAborted();
  if (result.messages.some((message) => message.type === "error"))
    throw new Error(
      "Some document content could not be converted. Your current script is unchanged.",
    );
  if (result.messages.length)
    warnings.add(
      "Some Word-specific formatting was simplified to Become’s document styles.",
    );
  const clean = DOMPurify.sanitize(result.value, {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "a",
      "ul",
      "ol",
      "li",
      "br",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "colspan",
      "rowspan",
      "start",
    ],
  });
  // The DOM is detached and already sanitized; it is never inserted as raw HTML.
  const parsed = new DOMParser().parseFromString(clean, "text/html");
  for (const link of parsed.querySelectorAll("a")) {
    if (!isScriptLinkAllowed(link.getAttribute("href") ?? "")) {
      link.replaceWith(...link.childNodes);
      warnings.add("Unsupported links were converted to plain text.");
    }
  }
  for (const image of parsed.querySelectorAll("img")) {
    const owned = ownedImages.get(image.getAttribute("src") ?? "");
    if (!owned)
      throw new Error(
        "A document image could not be imported. Your script is unchanged.",
      );
    image.setAttribute("data-media-id", owned.id);
    image.setAttribute("width", String(owned.width));
    image.setAttribute("height", String(owned.height));
  }
  for (const heading of parsed.querySelectorAll("h4,h5,h6")) {
    const replacement = parsed.createElement("h3");
    replacement.append(...heading.childNodes);
    heading.replaceWith(replacement);
    warnings.add("Headings were mapped to Become’s three heading levels.");
  }
  const document = validateScriptDocument({
    schemaVersion: 1,
    content: generateJSON(parsed.body.innerHTML, getScriptExtensions()),
  });
  return { document, warnings: [...warnings] };
}
