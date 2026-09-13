/** UTF-8 budgets preserve complete code points, including non-Latin user writing. */
export function boundedExcerpt(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  let bytes = 0,
    result = "";
  for (const point of value) {
    bytes += Buffer.byteLength(point, "utf8");
    if (bytes > maxBytes) break;
    result += point;
  }
  return result;
}
export function measurePacket<T extends { payloadBytes: number }>(
  packet: T,
): T {
  let size = Buffer.byteLength(JSON.stringify(packet), "utf8");
  while (size !== packet.payloadBytes) {
    packet.payloadBytes = size;
    size = Buffer.byteLength(JSON.stringify(packet), "utf8");
  }
  return packet;
}
