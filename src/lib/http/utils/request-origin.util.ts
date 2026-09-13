/** Use the configured public origin, never an internal reverse-proxy URL. */
export function isTrustedRequestOrigin(request: Request, publicOrigin: string) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return (
      ["http:", "https:"].includes(origin.protocol) &&
      origin.origin === new URL(publicOrigin).origin
    );
  } catch {
    return false;
  }
}
