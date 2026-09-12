import {
  SCRIPT_MAX_IMPORT_BYTES,
  SCRIPT_MAX_IMPORT_EXPANDED_BYTES,
} from "@/features/content/scripts/constants/content-script.constants";

// Check the ZIP directory before asking the DOCX converter to inflate entries.
// Reject encrypted, multi-volume, ZIP64, and oversized archives explicitly.
export function checkScriptDocxArchive(buffer: ArrayBuffer) {
  if (buffer.byteLength > SCRIPT_MAX_IMPORT_BYTES)
    throw new Error("Choose a document up to 10 MB.");
  const view = new DataView(buffer);
  let end = -1;
  for (
    let offset = buffer.byteLength - 22;
    offset >= Math.max(0, buffer.byteLength - 65557);
    offset--
  ) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === buffer.byteLength
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("This file is not a readable Word document.");
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count ||
    count > 2000 ||
    offset + directorySize > end
  )
    throw new Error("This Word document is too complex to import.");
  const directoryEnd = offset + directorySize;
  let expanded = 0,
    hasDocument = false;
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > directoryEnd ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error("This Word document is damaged.");
    if (view.getUint16(offset + 8, true) & 1)
      throw new Error("Remove the document password before importing.");
    const method = view.getUint16(offset + 10, true);
    if (method !== 0 && method !== 8)
      throw new Error("This Word document uses unsupported compression.");
    expanded += view.getUint32(offset + 24, true);
    if (expanded > SCRIPT_MAX_IMPORT_EXPANDED_BYTES)
      throw new Error(
        "This document expands beyond 40 MB. Reduce its images before importing.",
      );
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > directoryEnd) throw new Error("This Word document is damaged.");
    const name = new TextDecoder().decode(
      new Uint8Array(buffer, offset + 46, nameLength),
    );
    if (name === "word/document.xml") hasDocument = true;
    offset = next;
  }
  if (!hasDocument || offset !== directoryEnd)
    throw new Error("Choose a .docx Word document.");
}
