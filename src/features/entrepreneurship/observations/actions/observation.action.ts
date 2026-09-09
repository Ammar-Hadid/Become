"use server";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  correctObservation,
  withdrawObservation,
} from "@/features/entrepreneurship/observations/services/observation.service";
export async function correctObservationAction(
  id: string,
  expectedVersion: number,
  form: FormData,
) {
  return businessMutation((userId) =>
    correctObservation(userId, id, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      expectedVersion,
      meaningUnchanged: form.get("meaningUnchanged") === "on",
    }),
  );
}
export async function withdrawObservationAction(id: string, form: FormData) {
  return businessMutation((userId) =>
    withdrawObservation(
      userId,
      id,
      String(form.get("captureKey")),
      String(form.get("reason") ?? ""),
    ),
  );
}
