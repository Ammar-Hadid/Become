import { minMoney, positivePart } from "@/lib/money/utils/money.util";
export function goalFunding(target: bigint, spent: bigint, allocated: bigint) {
  const remaining = positivePart(target - spent);
  return {
    target,
    spent,
    remaining,
    allocated,
    funded: minMoney(allocated, remaining),
    gap: positivePart(remaining - allocated),
    overAllocated: positivePart(allocated - remaining),
  };
}
export function savingsPool(
  liquid: bigint | null,
  reserve: bigint | null,
  allocated: bigint,
) {
  const configured = reserve !== null;
  if (liquid === null)
    return {
      liquid,
      reserve,
      configured,
      allocated,
      aboveReserve: null,
      unallocated: null,
      underfunding: null,
      reserveCovered: null,
      reserveShortfall: null,
    };
  const threshold = reserve ?? 0n;
  const aboveReserve = positivePart(liquid - threshold);
  return {
    liquid,
    reserve,
    configured,
    allocated,
    aboveReserve,
    unallocated: positivePart(aboveReserve - allocated),
    underfunding: positivePart(allocated - aboveReserve),
    reserveCovered: minMoney(positivePart(liquid), threshold),
    reserveShortfall: positivePart(threshold - positivePart(liquid)),
  };
}
