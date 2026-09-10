-- CreateTable
CREATE TABLE "payment_session_allocation" (
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_session_allocation_pkey" PRIMARY KEY ("transactionId","sessionId")
);

-- CreateIndex
CREATE INDEX "payment_session_allocation_userId_sessionId_idx" ON "payment_session_allocation"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "payment_session_allocation" ADD CONSTRAINT "payment_session_allocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_session_allocation" ADD CONSTRAINT "payment_session_allocation_transactionId_userId_fkey" FOREIGN KEY ("transactionId", "userId") REFERENCES "financial_transaction"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_session_allocation" ADD CONSTRAINT "payment_session_allocation_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "session"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payment_session_allocation ADD CONSTRAINT payment_allocation_positive CHECK ("amountMinor" > 0);
