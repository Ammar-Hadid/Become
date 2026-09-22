"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEngineeringEvidence,
  deleteEngineeringEvidence,
  updateEngineeringEvidence,
} from "@/features/engineering/evidence/services/engineering-evidence.service";
import { engineeringEvidenceSchema } from "@/features/engineering/schemas/engineering.schema";
import type { EngineeringFormState } from "@/features/engineering/projects/actions/engineering-project.action";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export async function createEngineeringEvidenceAction(
  _previousState: EngineeringFormState,
  formData: FormData,
): Promise<EngineeringFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const parsed = engineeringEvidenceSchema.safeParse(
    evidenceFormValues(formData),
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid evidence." };
  const result = await createEngineeringEvidence(user.id, parsed.data);
  if (result.status === "invalid-links")
    return { error: "The selected project or session is not valid." };

  revalidateEngineeringPaths();
  redirect(`/engineering/evidence?created=${encodeURIComponent(result.evidenceId)}`);
}

export async function updateEngineeringEvidenceAction(
  evidenceId: string,
  _previousState: EngineeringFormState,
  formData: FormData,
): Promise<EngineeringFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const parsed = engineeringEvidenceSchema.safeParse(
    evidenceFormValues(formData),
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid evidence." };
  const result = await updateEngineeringEvidence(
    user.id,
    evidenceId,
    parsed.data,
  );
  if (result.status === "not-found") return { error: "Evidence not found." };
  if (result.status === "invalid-links")
    return { error: "The selected project or session is not valid." };

  revalidateEngineeringPaths();
  redirect("/engineering/evidence");
}

export async function deleteEngineeringEvidenceAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const evidenceId = String(formData.get("evidenceId") ?? "");
  if (evidenceId) await deleteEngineeringEvidence(user.id, evidenceId);
  revalidateEngineeringPaths();
  redirect("/engineering/evidence");
}

function evidenceFormValues(formData: FormData) {
  return {
    type: formData.get("type"),
    title: formData.get("title"),
    details: formData.get("details"),
    occurredAt: formData.get("occurredAt"),
    projectId: formData.get("projectId"),
    sessionId: formData.get("sessionId"),
  };
}

function revalidateEngineeringPaths() {
  revalidatePath("/engineering");
  revalidatePath("/engineering/projects");
  revalidatePath("/engineering/evidence");
  revalidatePath("/sessions");
}
