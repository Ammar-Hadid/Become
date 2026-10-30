import { afterEach, describe, expect, it, vi } from "vitest";
import { searchBusinessRecordsAction } from "../actions/business-record-search.action";
import { searchBusinessRecordsForPicker } from "./business-record-search-client.adapter";

vi.mock("../actions/business-record-search.action", () => ({
  searchBusinessRecordsAction: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("record picker search recovery", () => {
  it("returns a retryable error when the server action rejects", async () => {
    vi.mocked(searchBusinessRecordsAction).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    await expect(
      searchBusinessRecordsForPicker({ kind: "company" }),
    ).resolves.toEqual({
      items: [],
      next: null,
      error: "Could not load records. Try again.",
    });
  });

  it("releases loading after a stalled search and allows a later search to succeed", async () => {
    vi.useFakeTimers();
    vi.mocked(searchBusinessRecordsAction).mockImplementationOnce(
      () => new Promise(() => {}),
    );
    const pending = searchBusinessRecordsForPicker({ kind: "company" });
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).resolves.toMatchObject({
      error: "Could not load records. Try again.",
    });
    vi.mocked(searchBusinessRecordsAction).mockResolvedValue({
      items: [],
      next: null,
    });
    await expect(
      searchBusinessRecordsForPicker({ kind: "company" }),
    ).resolves.toEqual({ items: [], next: null });
    expect(vi.getTimerCount()).toBe(0);
  });
});
