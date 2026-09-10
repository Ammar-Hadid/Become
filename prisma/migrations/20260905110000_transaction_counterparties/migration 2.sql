-- CreateTable
CREATE TABLE "counterparty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparty_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "financial_transaction" ADD COLUMN "counterpartyId" TEXT;

-- Backfill one canonical counterparty for each exact case-insensitive name per
-- user. The earliest transaction supplies the preserved display spelling.
INSERT INTO "counterparty" (
    "id",
    "userId",
    "name",
    "normalizedName",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-counterparty-' || md5("userId" || E'\u001f' || "normalizedName"),
    "userId",
    "name",
    "normalizedName",
    "createdAt",
    "createdAt"
FROM (
    SELECT DISTINCT ON ("userId", LOWER(BTRIM("counterparty")))
        "userId",
        BTRIM("counterparty") AS "name",
        LOWER(BTRIM("counterparty")) AS "normalizedName",
        "createdAt"
    FROM "financial_transaction"
    WHERE "counterparty" IS NOT NULL
      AND BTRIM("counterparty") <> ''
    ORDER BY
        "userId",
        LOWER(BTRIM("counterparty")),
        "occurredAt" ASC,
        "id" ASC
) AS "canonical_counterparty";

UPDATE "financial_transaction" AS "transaction"
SET "counterpartyId" = "counterparty"."id"
FROM "counterparty"
WHERE "counterparty"."userId" = "transaction"."userId"
  AND "counterparty"."normalizedName" = LOWER(BTRIM("transaction"."counterparty"));

-- Fail the migration rather than silently discard a meaningful historical
-- value if any nonblank counterparty could not be linked.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "financial_transaction"
        WHERE "counterparty" IS NOT NULL
          AND BTRIM("counterparty") <> ''
          AND "counterpartyId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Counterparty backfill left nonblank transaction values unlinked';
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "counterparty_id_userId_key" ON "counterparty"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "counterparty_userId_normalizedName_key" ON "counterparty"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "counterparty_userId_archivedAt_name_idx" ON "counterparty"("userId", "archivedAt", "name");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_counterpartyId_occurredAt_idx" ON "financial_transaction"("userId", "counterpartyId", "occurredAt");

-- AddForeignKey
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_counterpartyId_userId_fkey" FOREIGN KEY ("counterpartyId", "userId") REFERENCES "counterparty"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "financial_transaction" DROP COLUMN "counterparty";
