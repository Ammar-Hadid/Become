import type { ForecastMovement } from "@/features/finance/forecast/types/finance-forecast.types";
export type PendingTransferObservation = {
  id: string;
  accountId: string;
  amountMinor: bigint;
  direction: "DEBIT" | "CREDIT";
  activityOn: string;
  identity: string | null;
};
export type OwnedAccountIdentity = { accountId: string; identities: string[] };

// Forecast the counterpart of a verified owned-account movement. These are
// projected movements only: the banking ledger still contains observed legs.
export function pendingOwnedTransfers(
  observations: PendingTransferObservation[],
  identities: OwnedAccountIdentity[],
  asOf: string,
) {
  const ownedObservationIds = new Set<string>();
  const groups = new Map<
    string,
    { from: string; to: string; debit: bigint; credit: bigint; on: string }
  >();
  for (const observation of observations) {
    if (!observation.identity) continue;
    const targets = [
      ...new Set(
        identities
          .filter(
            (account) =>
              account.accountId !== observation.accountId &&
              account.identities.includes(observation.identity!),
          )
          .map((account) => account.accountId),
      ),
    ];
    if (targets.length !== 1) continue;
    ownedObservationIds.add(observation.id);
    const from =
      observation.direction === "DEBIT" ? observation.accountId : targets[0];
    const to =
      observation.direction === "CREDIT" ? observation.accountId : targets[0];
    const key = `${from}:${to}`;
    const group = groups.get(key) ?? {
      from,
      to,
      debit: 0n,
      credit: 0n,
      on: asOf,
    };
    group[observation.direction === "DEBIT" ? "debit" : "credit"] +=
      observation.amountMinor;
    if (observation.activityOn > group.on) group.on = observation.activityOn;
    groups.set(key, group);
  }
  const counterpartMovements: ForecastMovement[] = [];
  for (const [key, group] of groups) {
    const difference = group.debit - group.credit;
    if (difference === 0n) continue;
    counterpartMovements.push({
      id: `pending-counterpart:${key}`,
      accountId: difference > 0n ? group.to : group.from,
      amountMinor: difference,
      on: group.on,
      label: "Expected counterpart of a pending owned transfer",
      kind: "PENDING",
    });
  }
  return { ownedObservationIds, counterpartMovements };
}
