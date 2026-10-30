import { mergeAttributes, type Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { getDocumentEditorExtensions } from "@/components/ui/document-editor/config/document-editor.config";
import { isScriptLinkAllowed } from "@/features/content/scripts/utils/content-script-url.util";

export const ScriptImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: "" },
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attributes) => ({ "data-media-id": attributes.mediaId }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) => ({ "data-caption": attributes.caption }),
      },
      size: {
        default: "full",
        parseHTML: (element) => element.getAttribute("data-size") ?? "full",
        renderHTML: (attributes) => ({ "data-size": attributes.size }),
      },
      textAlign: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({ "data-align": attributes.textAlign }),
      },
      decorative: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-decorative") === "true",
        renderHTML: (attributes) => ({
          "data-decorative": String(attributes.decorative),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'img[data-media-id][src^="/api/content/scripts/images/"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    const image = [
      "img",
      mergeAttributes(HTMLAttributes, {
        alt: attrs.decorative ? "" : attrs.alt,
        loading: "lazy",
      }),
    ];
    return [
      "figure",
      {
        "data-script-image": "",
        "data-size": attrs.size,
        "data-align": attrs.textAlign,
      },
      image,
      ...(attrs.caption ? [["figcaption", {}, attrs.caption]] : []),
    ];
  },
  addInputRules() {
    return [];
  },
});

// This schema is shared by the editor, import/export, and server validation.
// It has no browser side effects; getSchema() can run on the server.
export function getScriptExtensions(): Extensions {
  return [
    ...getDocumentEditorExtensions({ isAllowedUri: isScriptLinkAllowed }),
    TableKit.configure({ table: { resizable: false } }),
    ScriptImage.configure({ allowBase64: false, resize: false }),
  ];
}
