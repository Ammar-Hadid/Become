"use server";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { searchBusinessRecords } from "../queries/business-record-search.query";
import type {
  BusinessRecordOption,
  BusinessRecordSearch,
} from "../schemas/business-record-search.schema";
export async function searchBusinessRecordsAction(
  input: BusinessRecordSearch,
): Promise<{
  items: BusinessRecordOption[];
  next: string | null;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user)
    return { items: [], next: null, error: "Sign in to search your records." };
  try {
    return await searchBusinessRecords(user.id, input);
  } catch {
    return {
      items: [],
      next: null,
      error: "Could not load records. Try again.",
    };
  }
}
