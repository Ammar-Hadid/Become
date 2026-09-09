"use server";
import { linkCompanyWorkSource } from "@/features/entrepreneurship/market/services/company-work-source.service";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  saveMarketRecord,
  addCompanyToExploration,
  archiveMarketRecord,
  changeNicheDirection,
} from "@/features/entrepreneurship/market/services/market.service";
export async function saveMarketAction(
  kind: "company" | "niche",
  id: string | undefined,
  form: FormData,
) {
  return businessMutation((userId) =>
    saveMarketRecord(
      userId,
      kind,
      { ...Object.fromEntries(form), nicheIds: form.getAll("nicheIds") },
      id,
    ),
  );
}
export async function archiveMarketAction(
  kind: "company" | "niche",
  id: string,
  restore: boolean,
) {
  return businessMutation((userId) =>
    archiveMarketRecord(userId, kind, id, restore),
  );
}
export async function changeDirectionAction(id: string, form: FormData) {
  return businessMutation((userId) =>
    changeNicheDirection(userId, id, Object.fromEntries(form)),
  );
}

export async function linkCompanyWorkSourceAction(
  companyId: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    linkCompanyWorkSource(userId, companyId, String(form.get("captureKey")), {
      workSourceId: String(form.get("workSourceId") ?? ""),
      name: String(form.get("name") ?? ""),
    }),
  );
}

export async function addCompanyToExplorationAction(
  nicheId: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    addCompanyToExploration(
      userId,
      nicheId,
      String(form.get("companyId") ?? ""),
    ),
  );
}
