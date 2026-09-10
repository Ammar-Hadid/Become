-- CreateTable
CREATE TABLE "finance_currency_policy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "protectedReserveMinor" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_currency_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finance_currency_policy_userId_currency_key" ON "finance_currency_policy"("userId", "currency");

-- AddForeignKey
ALTER TABLE "finance_currency_policy" ADD CONSTRAINT "finance_currency_policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finance_currency_policy" ADD CONSTRAINT "finance_reserve_nonnegative" CHECK ("protectedReserveMinor" IS NULL OR "protectedReserveMinor" >= 0);
