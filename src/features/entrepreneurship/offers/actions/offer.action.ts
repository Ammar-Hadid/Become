"use server";
import { observationFormEntries } from "@/features/entrepreneurship/interactions/utils/interaction-form.util";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  saveOfferRevision,
  recordOfferEvent,
  chooseOfferContinuation,
  retractOfferEvent,
} from "@/features/entrepreneurship/offers/services/offer.service";
export async function saveOfferAction(offerId: string | null, form: FormData) {
  return businessMutation((userId) =>
    saveOfferRevision(userId, offerId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      problemIds: form.getAll("problemIds"),
    }),
  );
}
export async function offerEventAction(offerId: string, form: FormData) {
  const [interactionId, interactionRevisionId] = String(
    form.get("interaction") ?? "",
  ).split(":");
  return businessMutation((userId) =>
    recordOfferEvent(userId, offerId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      interactionId,
      interactionRevisionId,
      observations: observationFormEntries(form),
    }),
  );
}
export async function offerContinuationAction(offerId: string, form: FormData) {
  return businessMutation((userId) =>
    chooseOfferContinuation(userId, offerId, String(form.get("captureKey")), {
      choice: String(form.get("choice")),
      workSourceId: String(form.get("workSourceId") ?? ""),
      name: String(form.get("name") ?? ""),
    }),
  );
}
export async function retractOfferEventAction(id: string, form: FormData) {
  return businessMutation((userId) =>
    retractOfferEvent(userId, id, String(form.get("reason") ?? "")),
  );
}
