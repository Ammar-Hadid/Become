/** A request deadline that also follows caller cancellation, without native signal composition. */
export function createRequestDeadline(milliseconds: number, parent?: AbortSignal) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function dispose() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    parent?.removeEventListener("abort", abortFromParent);
  }

  function abortFromParent() {
    controller.abort(parent?.reason);
    dispose();
  }

  if (parent?.aborted) {
    abortFromParent();
  } else {
    parent?.addEventListener("abort", abortFromParent, { once: true });
    // Retain the controller through an explicit timer: composed native timeout
    // signals can stop firing in WebKit while a fetch is still pending.
    timer = setTimeout(() => {
      controller.abort(new DOMException("The request timed out.", "TimeoutError"));
      dispose();
    }, milliseconds);
  }

  // Call after consuming the response body, including every failure/return path.
  return { signal: controller.signal, dispose };
}
