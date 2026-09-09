"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveIncomeOpportunity,
  continueAcceptedOpportunity,
  archiveIncomeOpportunity,
} from "@/features/finance/opportunities/services/income-opportunity.service";
export async function saveOpportunityAction(data: FormData) {
  return financeMutation(async (userId) => {
    const record = await saveIncomeOpportunity(
      userId,
      Object.fromEntries(data),
      String(data.get("id") || "") || undefined,
    );
    return { id: record.id };
  });
}
export async function createAcceptedSourceAction(data: FormData) {
  return financeMutation((userId) =>
    continueAcceptedOpportunity(
      userId,
      String(data.get("opportunityId")),
      "create",
      Object.fromEntries(data),
    ),
  );
}
export async function linkAcceptedSourceAction(data: FormData) {
  return financeMutation((userId) =>
    continueAcceptedOpportunity(
      userId,
      String(data.get("opportunityId")),
      "link",
      String(data.get("sourceId")),
    ),
  );
}
export async function archiveOpportunityAction(data: FormData) {
  return financeMutation((userId) =>
    archiveIncomeOpportunity(userId, String(data.get("id"))),
  );
}
