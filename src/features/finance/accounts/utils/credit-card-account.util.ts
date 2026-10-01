type SettlementAccount = {
  id: string;
  name: string;
  currency: string;
  type: string;
  archivedAt: Date | null;
};

export function requiresSettlementAccount(
  accountType: string,
  repaymentMethod: string,
) {
  return accountType === "CREDIT_CARD" && repaymentMethod === "LINKED_ACCOUNT";
}

export function eligibleSettlementAccounts<T extends SettlementAccount>(
  accounts: T[],
  currency: string,
) {
  return accounts.filter(
    (account) =>
      account.archivedAt === null &&
      account.currency === currency &&
      account.type !== "CREDIT_CARD",
  );
}
