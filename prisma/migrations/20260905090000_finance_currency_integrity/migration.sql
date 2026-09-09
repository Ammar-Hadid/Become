-- DropForeignKey
ALTER TABLE "financial_transaction" DROP CONSTRAINT "financial_transaction_accountId_userId_fkey";

-- DropForeignKey
ALTER TABLE "financial_transaction" DROP CONSTRAINT "financial_transaction_destinationAccountId_userId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_id_userId_currency_key" ON "financial_account"("id", "userId", "currency");

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_accountId_userId_currency_fkey" FOREIGN KEY ("accountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_destinationAccountId_userId_currency_fkey" FOREIGN KEY ("destinationAccountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

