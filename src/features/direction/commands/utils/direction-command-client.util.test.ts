import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDirectionCommand } from "./direction-command-client.util";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Direction command delivery", () => {
  it("bounds a stalled save and keeps its result uncertain", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(options.signal?.reason),
            );
          }),
      ),
    );
    const request = sendDirectionCommand({
      type: "DIRECTION_LIFECYCLE",
      operationKey: "retry-the-same-operation",
      kind: "GOAL",
      id: "goal",
      expectedVersion: 1,
      action: "PAUSE",
      reason: "Pause while reviewing",
    });
    deadline.abort(new DOMException("Timed out", "TimeoutError"));
    const result = await Promise.race([
      request,
      new Promise<never>((_resolve, reject) =>
        setTimeout(
          () => reject(new Error("Save remained pending after its deadline")),
          100,
        ),
      ),
    ]);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(15_000);
    expect(result.delivery).toBe("uncertain");
    expect(result.error).toContain("entries are still here");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
