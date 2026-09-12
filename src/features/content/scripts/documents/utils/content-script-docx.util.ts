import type { JSONContent } from "@tiptap/core";
import type {
  IParagraphOptions,
  INumberingOptions,
  ParagraphChild,
} from "docx";
import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";
import { validateScriptDocument } from "@/features/content/scripts/utils/content-script-document.util";

export type ScriptExportImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
};
export type ScriptExportTypography = {
  font: string;
  body: number;
  headings: [number, number, number];
};

export async function createScriptDocx(
  document: ScriptDocument,
  title: string,
  typography: ScriptExportTypography,
  images: Map<string, ScriptExportImage>,
) {
  validateScriptDocument(document);
  const {
    Document,
    Paragraph,
    TextRun,
    ExternalHyperlink,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    Packer,
    AlignmentType,
    HeadingLevel,
    LevelFormat,
    BorderStyle,
    WidthType,
  } = await import("docx");
  const numbering: {
    reference: string;
    levels: INumberingOptions["config"][number]["levels"];
  }[] = [];
  const alignment = (value: unknown) =>
    value === "center"
      ? AlignmentType.CENTER
      : value === "right"
        ? AlignmentType.RIGHT
        : value === "justify"
          ? AlignmentType.JUSTIFIED
          : AlignmentType.LEFT;

  function inline(node: JSONContent): ParagraphChild[] {
    if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (node.type !== "text") return (node.content ?? []).flatMap(inline);
    const marks = node.marks ?? [];
    const run = new TextRun({
      text: node.text ?? "",
      bold: marks.some((mark) => mark.type === "bold"),
      italics: marks.some((mark) => mark.type === "italic"),
      underline: marks.some((mark) => mark.type === "underline")
        ? {}
        : undefined,
      strike: marks.some((mark) => mark.type === "strike"),
    });
    const link = marks.find((mark) => mark.type === "link");
    return link
      ? [new ExternalHyperlink({ link: link.attrs!.href, children: [run] })]
      : [run];
  }

  function blocks(
    nodes: JSONContent[],
    depth = 0,
    paragraphOptions: IParagraphOptions = {},
  ): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] {
    return nodes.flatMap(
      (
        node,
      ): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] => {
        if (node.type === "paragraph" || node.type === "heading") {
          const level = Number(node.attrs?.level ?? 1);
          return [
            new Paragraph({
              ...paragraphOptions,
              alignment: alignment(node.attrs?.textAlign),
              ...(node.type === "heading"
                ? {
                    heading: [
                      HeadingLevel.HEADING_1,
                      HeadingLevel.HEADING_2,
                      HeadingLevel.HEADING_3,
                    ][level - 1],
                  }
                : {}),
              children: (node.content ?? []).flatMap(inline),
            }),
          ];
        }
        if (node.type === "blockquote")
          return blocks(node.content ?? [], depth, {
            indent: { left: 360 },
            style: "Quote",
          });
        if (node.type === "horizontalRule")
          return [
            new Paragraph({
              border: {
                bottom: { color: "999999", style: BorderStyle.SINGLE, size: 4 },
              },
            }),
          ];
        if (node.type === "bulletList" || node.type === "orderedList") {
          if (depth > 8)
            throw new Error(
              "Word supports up to nine nested list levels. Simplify this list before exporting.",
            );
          const reference = `script-list-${numbering.length}`;
          if (node.type === "orderedList")
            numbering.push({
              reference,
              levels: Array.from({ length: 9 }, (_, level) => ({
                level,
                format: LevelFormat.DECIMAL,
                text: `%${level + 1}.`,
                start: Number(node.attrs?.start ?? 1),
                style: {
                  paragraph: {
                    indent: { left: (level + 1) * 360, hanging: 180 },
                  },
                },
              })),
            });
          return (node.content ?? []).flatMap((item) =>
            (item.content ?? []).flatMap((child, index) => {
              if (child.type === "bulletList" || child.type === "orderedList")
                return blocks([child], depth + 1);
              return blocks(
                [child],
                depth,
                index === 0
                  ? node.type === "bulletList"
                    ? { bullet: { level: depth } }
                    : { numbering: { reference, level: depth } }
                  : { indent: { left: (depth + 1) * 360 } },
              );
            }),
          );
        }
        if (node.type === "table")
          return [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: (node.content ?? []).map(
                (row) =>
                  new TableRow({
                    tableHeader: row.content?.every(
                      (cell) => cell.type === "tableHeader",
                    ),
                    children: (row.content ?? []).map(
                      (cell) =>
                        new TableCell({
                          columnSpan: Number(cell.attrs?.colspan ?? 1),
                          rowSpan: Number(cell.attrs?.rowspan ?? 1),
                          children: [
                            ...blocks(cell.content ?? []),
                            ...(cell.content?.at(-1)?.type === "paragraph"
                              ? []
                              : [new Paragraph("")]),
                          ],
                        }),
                    ),
                  }),
              ),
            }),
          ];
        if (node.type === "image") {
          const image = images.get(String(node.attrs?.mediaId));
          if (!image)
            throw new Error(
              "An image could not be loaded for export. Retry when it is available.",
            );
          const maximum =
            node.attrs?.size === "small"
              ? 200
              : node.attrs?.size === "medium"
                ? 400
                : 600;
          const width = Math.min(image.width, maximum);
          return [
            new Paragraph({
              alignment: alignment(node.attrs?.textAlign),
              children: [
                new ImageRun({
                  type: "png",
                  data: image.bytes,
                  transformation: {
                    width,
                    height: Math.round((image.height * width) / image.width),
                  },
                  altText: {
                    title: String(node.attrs?.title ?? ""),
                    description: String(node.attrs?.alt ?? ""),
                    name: "Script image",
                  },
                }),
              ],
            }),
            ...(node.attrs?.caption
              ? [
                  new Paragraph({
                    text: String(node.attrs.caption),
                    alignment: AlignmentType.CENTER,
                  }),
                ]
              : []),
          ];
        }
        throw new Error(
          `The ${node.type ?? "unknown"} block cannot be exported.`,
        );
      },
    );
  }

  const children = blocks(document.content.content ?? []);
  const file = new Document({
    title,
    creator: "Become",
    styles: {
      default: {
        document: { run: { font: typography.font, size: typography.body } },
        heading1: {
          run: {
            font: typography.font,
            size: typography.headings[0],
            bold: true,
          },
        },
        heading2: {
          run: {
            font: typography.font,
            size: typography.headings[1],
            bold: true,
          },
        },
        heading3: {
          run: {
            font: typography.font,
            size: typography.headings[2],
            bold: true,
          },
        },
      },
    },
    numbering: { config: numbering },
    sections: [{ children }],
  });
  return Packer.toBlob(file);
}
