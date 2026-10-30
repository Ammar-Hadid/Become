import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

/** Common writing schema for Become documents; each domain adds only the nodes it stores. */
export function getDocumentEditorExtensions(options: {
  isAllowedUri?: (url: string, ctx: unknown) => boolean;
  links?: boolean;
} = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      link: options.links === false
        ? false
        : {
            openOnClick: false,
            defaultProtocol: "https",
            ...(options.isAllowedUri ? { isAllowedUri: options.isAllowedUri } : {}),
            HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
          },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "left" }),
  ];
}
