import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";

export async function getFinancialTransactionAccountOptions(
  userId: string,
  currency?: string,
) {
  return (await getFinancialPosition(userId))
    .filter((account) => !currency || account.currency === currency)
    .map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      balanceMinor:
        account.balanceMinor === null ? null : account.balanceMinor.toString(),
    }));
}
