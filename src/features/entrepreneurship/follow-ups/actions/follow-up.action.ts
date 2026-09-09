"use server";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  saveFollowUp,
  resolveFollowUp,
} from "@/features/entrepreneurship/follow-ups/services/follow-up.service";
export async function saveFollowUpAction(
  target: { companyId?: string; interactionId?: string; offerId?: string },
  id: string | null,
  form: FormData,
) {
  return businessMutation((userId) =>
    saveFollowUp(
      userId,
      target,
      id,
      String(form.get("captureKey")),
      Object.fromEntries(form),
    ),
  );
}
export async function resolveFollowUpAction(
  id: string,
  action: "COMPLETE" | "CANCEL" | "REOPEN",
) {
  return businessMutation((userId) => resolveFollowUp(userId, id, action));
}
