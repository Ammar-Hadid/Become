"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEngineeringProject,
  setEngineeringProjectArchived,
  updateEngineeringProject,
} from "@/features/engineering/projects/services/engineering-project.service";
import { engineeringProjectSchema } from "@/features/engineering/schemas/engineering.schema";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export type EngineeringFormState = { error: string | null };

export async function createEngineeringProjectAction(
  _previousState: EngineeringFormState,
  formData: FormData,
): Promise<EngineeringFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const parsed = engineeringProjectSchema.safeParse(
    projectFormValues(formData),
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid project." };

  const result = await createEngineeringProject(user.id, parsed.data);
  if (result.status === "invalid-technologies")
    return { error: "One or more selected technologies are not available." };
  revalidateEngineeringPaths(result.projectId);
  redirect(`/engineering/projects/${result.projectId}`);
}

export async function updateEngineeringProjectAction(
  projectId: string,
  _previousState: EngineeringFormState,
  formData: FormData,
): Promise<EngineeringFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const parsed = engineeringProjectSchema.safeParse(
    projectFormValues(formData),
  );
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid project." };

  const result = await updateEngineeringProject(
    user.id,
    projectId,
    parsed.data,
  );
  if (result.status === "not-found") return { error: "Project not found." };
  if (result.status === "invalid-technologies")
    return { error: "One or more selected technologies are not available." };
  revalidateEngineeringPaths(projectId);
  redirect(`/engineering/projects/${projectId}`);
}

export async function archiveEngineeringProjectAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const projectId = String(formData.get("projectId") ?? "");
  if (projectId) await setEngineeringProjectArchived(user.id, projectId, true);
  revalidateEngineeringPaths(projectId);
  redirect("/engineering/projects");
}

export async function restoreEngineeringProjectAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const projectId = String(formData.get("projectId") ?? "");
  if (projectId) await setEngineeringProjectArchived(user.id, projectId, false);
  revalidateEngineeringPaths(projectId);
  redirect(`/engineering/projects/${projectId}`);
}

function projectFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    context: formData.get("context"),
    status: formData.get("status"),
    repositoryUrl: formData.get("repositoryUrl"),
    liveUrl: formData.get("liveUrl"),
    notes: formData.get("notes"),
    startedOn: formData.get("startedOn"),
    completedOn: formData.get("completedOn"),
    technologyIds: formData.getAll("technologyIds").map(String),
    customTechnologyNames: formData.getAll("customTechnologyNames").map(String),
  };
}

function revalidateEngineeringPaths(projectId: string) {
  revalidatePath("/engineering");
  revalidatePath("/engineering/projects");
  if (projectId) revalidatePath(`/engineering/projects/${projectId}`);
}
