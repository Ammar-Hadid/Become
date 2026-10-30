import { afterEach, describe, expect, it, vi } from "vitest";
import { sendThinkingCommand } from "./thinking-command.util";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Thinking command delivery", () => {
  it("bounds a stalled save without retrying the mutation automatically", async () => {
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
    const request = sendThinkingCommand({
      type: "SAVE_IDEA",
      operationKey: "retry-the-same-operation",
      draft: { title: "Preserved idea", notes: "", domainIds: [] },
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
    expect(result.error).toContain("retry the same submission");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
