"use server";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  createProblem,
  linkEvidence,
  recordObservation,
  assessProblem,
  withdrawEvidence,
  reconfirmEvidence,
  linkReceiptEvidence,
} from "@/features/entrepreneurship/problems/services/problem.service";
export async function linkReceiptEvidenceAction(
  problemId: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    linkReceiptEvidence(userId, problemId, String(form.get("captureKey")), {
      receiptAllocationId: String(form.get("receiptAllocationId")),
      stance: String(form.get("stance")),
      explanation: String(form.get("explanation")),
    }),
  );
}
export async function createProblemAction(form: FormData) {
  return businessMutation((userId) =>
    createProblem(
      userId,
      String(form.get("captureKey")),
      Object.fromEntries(form),
    ),
  );
}
export async function linkEvidenceAction(problemId: string, form: FormData) {
  const [observationId, observationRevisionId] = String(
    form.get("observation") ?? "",
  ).split(":");
  return businessMutation((userId) =>
    linkEvidence(userId, problemId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      observationId,
      observationRevisionId,
    }),
  );
}
export async function recordObservationAction(
  problemId: string | null,
  form: FormData,
) {
  const [interactionId, interactionRevisionId] = String(
    form.get("interaction") ?? "",
  ).split(":");
  return businessMutation((userId) =>
    recordObservation(userId, problemId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      interactionId,
      interactionRevisionId,
    }),
  );
}
export async function assessProblemAction(problemId: string, form: FormData) {
  return businessMutation((userId) =>
    assessProblem(userId, problemId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      evidenceIds: form.getAll("evidenceIds"),
    }),
  );
}
export async function withdrawEvidenceAction(
  problemId: string,
  id: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    withdrawEvidence(userId, problemId, id, String(form.get("reason") ?? "")),
  );
}
export async function reconfirmEvidenceAction(
  problemId: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    reconfirmEvidence(
      userId,
      problemId,
      form.getAll("evidenceIds").map(String),
    ),
  );
}
