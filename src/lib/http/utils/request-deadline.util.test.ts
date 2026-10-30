import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestDeadline } from "./request-deadline.util";

describe("request deadlines", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborts a pending request at the deadline without cancelling its parent", () => {
    const parent = new AbortController();
    const deadline = createRequestDeadline(15_000, parent.signal);
    vi.advanceTimersByTime(14_999);
    expect(deadline.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.signal.reason).toBeInstanceOf(DOMException);
    expect(deadline.signal.reason.name).toBe("TimeoutError");
    expect(parent.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("follows caller cancellation and clears its timer", () => {
    const parent = new AbortController();
    const deadline = createRequestDeadline(15_000, parent.signal);
    const reason = new DOMException("Screen closed.", "AbortError");
    parent.abort(reason);
    expect(deadline.signal.reason).toBe(reason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("immediately follows an already cancelled caller without scheduling a timer", () => {
    const parent = new AbortController();
    parent.abort();
    const deadline = createRequestDeadline(15_000, parent.signal);
    expect(deadline.signal.reason).toBe(parent.signal.reason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disposes the timer and caller listener after response consumption", () => {
    const parent = new AbortController();
    const deadline = createRequestDeadline(15_000, parent.signal);
    deadline.dispose();
    deadline.dispose();
    expect(vi.getTimerCount()).toBe(0);
    parent.abort();
    vi.advanceTimersByTime(15_000);
    expect(deadline.signal.aborted).toBe(false);
  });

  it("also bounds a request without caller cancellation", () => {
    const deadline = createRequestDeadline(60_000);
    vi.advanceTimersByTime(60_000);
    expect(deadline.signal.reason.name).toBe("TimeoutError");
    deadline.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
