"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveWorkSource,
  archiveWorkSource,
} from "@/features/finance/work-sources/services/work-source.service";
export async function saveWorkSourceAction(data: FormData) {
  return financeMutation(async (userId) => {
    const record = await saveWorkSource(
      userId,
      Object.fromEntries(data),
      String(data.get("id") || "") || undefined,
    );
    return { id: record.id };
  });
}
export async function archiveWorkSourceAction(data: FormData) {
  return financeMutation((userId) =>
    archiveWorkSource(userId, String(data.get("id"))),
  );
}
