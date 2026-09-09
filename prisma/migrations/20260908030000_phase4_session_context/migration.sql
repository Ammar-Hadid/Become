-- AlterTable
ALTER TABLE "interaction_revision" ADD COLUMN     "sourceSessionId" TEXT;

-- AlterTable
ALTER TABLE "problem_evidence" ADD COLUMN     "receiptSnapshot" JSONB;

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "businessCompanyId" TEXT,
ADD COLUMN     "businessCompanySnapshot" TEXT,
ADD COLUMN     "businessNicheId" TEXT,
ADD COLUMN     "businessNicheSnapshot" TEXT,
ADD COLUMN     "entrepreneurshipActivityKind" TEXT;

-- AlterTable
ALTER TABLE "business_receipt_allocation" ADD COLUMN     "sourceChangedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_sourceSessionId_userId_fkey" FOREIGN KEY ("sourceSessionId", "userId") REFERENCES "session"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_businessCompanyId_userId_fkey" FOREIGN KEY ("businessCompanyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_businessNicheId_userId_fkey" FOREIGN KEY ("businessNicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add current reference activities only. Do not reinterpret historical sessions.
INSERT INTO activity_type (id, "domainId", name, slug, "sortOrder", "enabled", "createdAt", "updatedAt")
SELECT 'phase4-' || md5(d.id || a.slug), d.id, a.name, a.slug, a.sort, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM domain d CROSS JOIN (VALUES ('Outreach preparation','outreach-preparation',12),('Other','other',13)) AS a(name,slug,sort)
WHERE d.slug='entrepreneurship' ON CONFLICT ("domainId",slug) DO NOTHING;
