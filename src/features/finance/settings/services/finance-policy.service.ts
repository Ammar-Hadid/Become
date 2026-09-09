import { currencySchema } from "@/lib/money/schemas/currency.schema";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { parseMoney } from "@/lib/money/utils/money.util";
import { FinanceError } from "@/features/finance/types/finance.types";
export async function lockCurrencyPolicy(
  tx: Prisma.TransactionClient,
  userId: string,
  currency: string,
) {
  await tx.financeCurrencyPolicy.upsert({
    where: { userId_currency: { userId, currency } },
    create: { userId, currency },
    update: {},
  });
  await tx.$queryRaw`SELECT id FROM finance_currency_policy WHERE "userId" = ${userId} AND currency = ${currency} FOR UPDATE`;
  return tx.financeCurrencyPolicy.findUniqueOrThrow({
    where: { userId_currency: { userId, currency } },
  });
}
export async function saveFinanceReserve(
  userId: string,
  inputCurrency: string,
  reserve: string,
) {
  let currency: string;
  let protectedReserveMinor: bigint | null;
  try {
    currency = currencySchema.parse(inputCurrency);
    protectedReserveMinor =
      reserve.trim() === "" ? null : parseMoney(reserve, currency);
  } catch (error) {
    throw new FinanceError((error as Error).message);
  }
  if (protectedReserveMinor !== null && protectedReserveMinor < 0n)
    throw new FinanceError("Reserve cannot be negative.");
  await prisma.$transaction(async (tx) => {
    const policy = await lockCurrencyPolicy(tx, userId, currency);
    await tx.financeCurrencyPolicy.update({
      where: { id: policy.id },
      data: { protectedReserveMinor },
    });
  });
}
