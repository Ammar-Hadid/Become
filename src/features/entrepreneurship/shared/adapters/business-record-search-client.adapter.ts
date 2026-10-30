import { searchBusinessRecordsAction } from "../actions/business-record-search.action";
import type { BusinessRecordSearch } from "../schemas/business-record-search.schema";

type SearchResult = Awaited<ReturnType<typeof searchBusinessRecordsAction>>;

export async function searchBusinessRecordsForPicker(
  input: BusinessRecordSearch,
): Promise<SearchResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Server Actions cannot be aborted by the caller. Bound the wait and ignore
    // a late result; a retry is a fresh read and cannot duplicate a mutation.
    return await Promise.race([
      searchBusinessRecordsAction(input),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Search timed out")), 15_000);
      }),
    ]);
  } catch {
    return {
      items: [],
      next: null,
      error: "Could not load records. Try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
