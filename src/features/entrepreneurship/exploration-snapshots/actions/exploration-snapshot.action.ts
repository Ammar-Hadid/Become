"use server";

import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  archiveExplorationClaim,
  correctExplorationClaim,
  correctExplorationUncertainty,
  createExplorationClaim,
  createExplorationUncertainty,
  publishExplorationSnapshot,
  resolveExplorationUncertainty,
} from "@/features/entrepreneurship/exploration-snapshots/services/exploration-snapshot.service";

export async function createExplorationClaimAction(
  captureKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    createExplorationClaim(userId, captureKey, input),
  );
}

export async function correctExplorationClaimAction(
  claimId: string,
  captureKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    correctExplorationClaim(userId, claimId, captureKey, input),
  );
}

export async function archiveExplorationClaimAction(
  claimId: string,
  captureKey: string,
) {
  return businessMutation((userId) =>
    archiveExplorationClaim(userId, claimId, captureKey),
  );
}

export async function createExplorationUncertaintyAction(
  captureKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    createExplorationUncertainty(userId, captureKey, input),
  );
}

export async function correctExplorationUncertaintyAction(
  uncertaintyId: string,
  captureKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    correctExplorationUncertainty(userId, uncertaintyId, captureKey, input),
  );
}

export async function resolveExplorationUncertaintyAction(
  uncertaintyId: string,
  captureKey: string,
) {
  return businessMutation((userId) =>
    resolveExplorationUncertainty(userId, uncertaintyId, captureKey),
  );
}

export async function publishExplorationSnapshotAction(
  captureKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    publishExplorationSnapshot(userId, captureKey, input),
  );
}
