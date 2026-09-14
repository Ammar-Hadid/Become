BEGIN;
-- DropForeignKey
ALTER TABLE "offer_revision" DROP CONSTRAINT "offer_revision_offerId_companyId_userId_fkey";

-- DropForeignKey
ALTER TABLE "business_receipt_allocation" DROP CONSTRAINT "business_receipt_allocation_offerRevisionId_companyId_user_fkey";

-- AlterTable
ALTER TABLE "niche" ADD COLUMN     "marketConclusion" TEXT DEFAULT 'UNDECIDED',
ADD COLUMN     "marketFocus" TEXT DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "interaction_revision" ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT,
ADD COLUMN     "sampleSize" INTEGER,
ADD COLUMN     "sampleUnit" TEXT;

-- AlterTable
ALTER TABLE "observation_revision" ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT,
ADD COLUMN     "sampleSize" INTEGER,
ADD COLUMN     "sampleUnit" TEXT;

-- AlterTable
ALTER TABLE "problem" ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "companySnapshot" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT;

-- AlterTable
ALTER TABLE "problem_assessment" ADD COLUMN     "audienceRevisionId" TEXT;

-- AlterTable
ALTER TABLE "niche_decision" ADD COLUMN     "conclusionScope" TEXT,
ADD COLUMN     "marketConclusion" TEXT DEFAULT 'UNDECIDED',
ADD COLUMN     "marketFocus" TEXT DEFAULT 'UNKNOWN',
ADD COLUMN     "sourceSnapshots" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "companySnapshot" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'SPECIFIC',
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "offer_revision" ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "companySnapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "offer_event" ADD COLUMN     "engagementId" TEXT;

-- AlterTable
ALTER TABLE "business_receipt_allocation" ADD COLUMN     "attributionFingerprint" TEXT,
ADD COLUMN     "audienceContextId" TEXT,
ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "engagementId" TEXT,
ADD COLUMN     "identityKind" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "nicheId" TEXT,
ADD COLUMN     "nicheSnapshot" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "personSnapshot" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "companySnapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "direction_criterion" ADD COLUMN     "marketType" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "segmentId" TEXT;

-- CreateTable
CREATE TABLE "market_person" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "market_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_segment" (
    "marketType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "audience_segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_niche" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "nicheId" TEXT NOT NULL,

    CONSTRAINT "person_niche_pkey" PRIMARY KEY ("personId","nicheId")
);

-- CreateTable
CREATE TABLE "audience_segment_niche" (
    "userId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "nicheId" TEXT NOT NULL,

    CONSTRAINT "audience_segment_niche_pkey" PRIMARY KEY ("segmentId","nicheId")
);

-- CreateTable
CREATE TABLE "audience_context" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audience_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_context_segment" (
    "userId" TEXT NOT NULL,
    "audienceContextId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,

    CONSTRAINT "audience_context_segment_pkey" PRIMARY KEY ("audienceContextId","segmentId")
);

-- CreateTable
CREATE TABLE "interaction_participant" (
    "userId" TEXT NOT NULL,
    "interactionRevisionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "roleSnapshot" TEXT,

    CONSTRAINT "interaction_participant_pkey" PRIMARY KEY ("interactionRevisionId","personId")
);

-- CreateTable
CREATE TABLE "problem_audience_revision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "audienceContextId" TEXT,
    "version" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_audience_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_engagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "audienceContextId" TEXT,
    "identityKind" TEXT NOT NULL,
    "personId" TEXT,
    "personSnapshot" TEXT,
    "companyId" TEXT,
    "companySnapshot" TEXT,
    "audienceLabel" TEXT,
    "continuationChoice" TEXT,
    "workSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_engagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_person_userId_normalizedName_idx" ON "market_person"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "market_person_id_userId_key" ON "market_person"("id", "userId");

-- CreateIndex
CREATE INDEX "audience_segment_userId_normalizedName_idx" ON "audience_segment"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "audience_segment_id_userId_key" ON "audience_segment"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "audience_context_id_userId_key" ON "audience_context"("id", "userId");

-- CreateIndex
CREATE INDEX "audience_context_segment_userId_segmentId_idx" ON "audience_context_segment"("userId", "segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "problem_audience_revision_problemId_version_key" ON "problem_audience_revision"("problemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "problem_audience_revision_id_problemId_userId_key" ON "problem_audience_revision"("id", "problemId", "userId");

-- CreateIndex
CREATE INDEX "offer_engagement_userId_offerId_createdAt_idx" ON "offer_engagement"("userId", "offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "offer_engagement_id_userId_key" ON "offer_engagement"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_engagement_id_offerId_userId_key" ON "offer_engagement"("id", "offerId", "userId");

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_assessment" ADD CONSTRAINT "problem_assessment_audienceRevisionId_problemId_userId_fkey" FOREIGN KEY ("audienceRevisionId", "problemId", "userId") REFERENCES "problem_audience_revision"("id", "problemId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision" ADD CONSTRAINT "offer_revision_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision" ADD CONSTRAINT "offer_revision_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision" ADD CONSTRAINT "offer_revision_offerId_userId_fkey" FOREIGN KEY ("offerId", "userId") REFERENCES "offer"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_event" ADD CONSTRAINT "offer_event_engagementId_offerId_userId_fkey" FOREIGN KEY ("engagementId", "offerId", "userId") REFERENCES "offer_engagement"("id", "offerId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_engagementId_userId_fkey" FOREIGN KEY ("engagementId", "userId") REFERENCES "offer_engagement"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_offerRevisionId_userId_fkey" FOREIGN KEY ("offerRevisionId", "userId") REFERENCES "offer_revision"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_segmentId_userId_fkey" FOREIGN KEY ("segmentId", "userId") REFERENCES "audience_segment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_person" ADD CONSTRAINT "market_person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_segment" ADD CONSTRAINT "audience_segment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_niche" ADD CONSTRAINT "person_niche_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_niche" ADD CONSTRAINT "person_niche_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_segment_niche" ADD CONSTRAINT "audience_segment_niche_segmentId_userId_fkey" FOREIGN KEY ("segmentId", "userId") REFERENCES "audience_segment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_segment_niche" ADD CONSTRAINT "audience_segment_niche_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_context" ADD CONSTRAINT "audience_context_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_context_segment" ADD CONSTRAINT "audience_context_segment_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_context_segment" ADD CONSTRAINT "audience_context_segment_segmentId_userId_fkey" FOREIGN KEY ("segmentId", "userId") REFERENCES "audience_segment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_participant" ADD CONSTRAINT "interaction_participant_interactionRevisionId_userId_fkey" FOREIGN KEY ("interactionRevisionId", "userId") REFERENCES "interaction_revision"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_participant" ADD CONSTRAINT "interaction_participant_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_audience_revision" ADD CONSTRAINT "problem_audience_revision_problemId_userId_fkey" FOREIGN KEY ("problemId", "userId") REFERENCES "problem"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_audience_revision" ADD CONSTRAINT "problem_audience_revision_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_offerId_userId_fkey" FOREIGN KEY ("offerId", "userId") REFERENCES "offer"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_audienceContextId_userId_fkey" FOREIGN KEY ("audienceContextId", "userId") REFERENCES "audience_context"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_personId_userId_fkey" FOREIGN KEY ("personId", "userId") REFERENCES "market_person"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_engagement" ADD CONSTRAINT "offer_engagement_workSourceId_userId_fkey" FOREIGN KEY ("workSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Absence of a historic classification is not a recorded choice of uncertainty.
UPDATE niche SET "marketFocus"=NULL,"marketConclusion"=NULL;
UPDATE niche_decision SET "marketFocus"=NULL,"marketConclusion"=NULL;
UPDATE interaction_revision SET "identityKind"='BUSINESS' WHERE "companyId" IS NOT NULL;
UPDATE observation_revision SET "identityKind"='BUSINESS' WHERE "companyId" IS NOT NULL;
INSERT INTO audience_context (id,"userId","marketType",description)
SELECT 'legacy-b2b-'||id,id,'B2B','Company-targeted terms or receipts recorded before audience support.' FROM "user" u
WHERE EXISTS (SELECT 1 FROM offer o WHERE o."userId"=u.id) OR EXISTS (SELECT 1 FROM business_receipt_allocation a WHERE a."userId"=u.id);
UPDATE offer o SET "audienceContextId"='legacy-b2b-'||o."userId","identityKind"='BUSINESS',"companySnapshot"=(SELECT v."companySnapshot" FROM offer_revision v WHERE v."offerId"=o.id ORDER BY v.version ASC LIMIT 1);
UPDATE offer_revision SET "audienceContextId"='legacy-b2b-'||"userId","identityKind"='BUSINESS';
UPDATE business_receipt_allocation SET "audienceContextId"='legacy-b2b-'||"userId","identityKind"='BUSINESS';
INSERT INTO offer_engagement (id,"userId","offerId","audienceContextId","identityKind","companyId","companySnapshot","continuationChoice","createdAt")
SELECT 'legacy-recipient-'||id,"userId",id,"audienceContextId",'BUSINESS',"companyId","companySnapshot","continuationChoice","createdAt" FROM offer;
UPDATE offer_event SET "engagementId"='legacy-recipient-'||"offerId";
UPDATE business_receipt_allocation a SET "engagementId"='legacy-recipient-'||v."offerId" FROM offer_revision v WHERE v.id=a."offerRevisionId" AND v."userId"=a."userId";
INSERT INTO problem_audience_revision (id,"userId","problemId",version,rationale,"createdAt")
SELECT 'legacy-scope-'||id,"userId",id,1,'Audience scope was not recorded in the original problem.',"createdAt" FROM problem;
UPDATE problem_assessment SET "audienceRevisionId"='legacy-scope-'||"problemId";

ALTER TABLE audience_context ADD CONSTRAINT audience_market_type CHECK ("marketType" IN ('UNKNOWN','B2C','B2B','BOTH'));
ALTER TABLE audience_segment ADD CONSTRAINT segment_market_type CHECK ("marketType" IN ('UNKNOWN','B2C','B2B','BOTH'));
ALTER TABLE niche ADD CONSTRAINT niche_market_focus CHECK ("marketFocus" IN ('UNKNOWN','B2C','B2B','BOTH'));
ALTER TABLE niche ADD CONSTRAINT niche_market_conclusion CHECK ("marketConclusion" IN ('UNDECIDED','B2C','B2B','BOTH','NEITHER'));
ALTER TABLE niche_decision ADD CONSTRAINT decision_market_focus CHECK ("marketFocus" IN ('UNKNOWN','B2C','B2B','BOTH'));
ALTER TABLE niche_decision ADD CONSTRAINT decision_market_conclusion CHECK ("marketConclusion" IN ('UNDECIDED','B2C','B2B','BOTH','NEITHER'));
ALTER TABLE offer ADD CONSTRAINT offer_mode CHECK (mode IN ('SPECIFIC','AUDIENCE_TEST'));
ALTER TABLE offer ADD CONSTRAINT offer_audience_test_recipient CHECK (mode<>'AUDIENCE_TEST' OR ("companyId" IS NULL AND "personId" IS NULL));
ALTER TABLE interaction_revision ADD CONSTRAINT interaction_sample CHECK (("sampleSize" IS NULL AND "sampleUnit" IS NULL) OR ("identityKind"='GROUP' AND "sampleSize">0 AND length("sampleUnit")>0));
ALTER TABLE observation_revision ADD CONSTRAINT observation_sample CHECK (("sampleSize" IS NULL AND "sampleUnit" IS NULL) OR ("identityKind"='GROUP' AND "sampleSize">0 AND length("sampleUnit")>0));
ALTER TABLE offer_engagement ADD CONSTRAINT engagement_individual CHECK ("identityKind" IN ('PERSON','BUSINESS','ANONYMOUS','UNSPECIFIED') AND ("personId" IS NOT NULL OR "companyId" IS NOT NULL OR length("audienceLabel")>0));
ALTER TABLE offer_event ADD CONSTRAINT offer_event_recipient CHECK ((kind IN ('SHARED','CLOSED','REOPENED') AND "engagementId" IS NULL) OR (kind NOT IN ('SHARED','CLOSED','REOPENED') AND "engagementId" IS NOT NULL));
CREATE UNIQUE INDEX offer_named_person_engagement ON offer_engagement ("offerId","personId",COALESCE("companyId",'')) WHERE "personId" IS NOT NULL;
CREATE UNIQUE INDEX offer_named_business_engagement ON offer_engagement ("offerId","companyId") WHERE "personId" IS NULL AND "companyId" IS NOT NULL;

-- Retain null-safe recipient invariants after generalizing the company-only FKs.
CREATE FUNCTION entrepreneurship_recipient_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_offer offer%ROWTYPE; recipient offer_engagement%ROWTYPE; terms offer_revision%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='offer_revision' THEN
  SELECT * INTO owner_offer FROM offer WHERE id=NEW."offerId" AND "userId"=NEW."userId";
  IF owner_offer.mode='SPECIFIC' AND (NEW."companyId" IS DISTINCT FROM owner_offer."companyId" OR NEW."personId" IS DISTINCT FROM owner_offer."personId") THEN RAISE EXCEPTION 'Offer revision recipient mismatch' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW."offerRevisionId" IS NOT NULL THEN
   SELECT * INTO terms FROM offer_revision WHERE id=NEW."offerRevisionId" AND "userId"=NEW."userId";
   IF NEW."engagementId" IS NOT NULL THEN
    SELECT * INTO recipient FROM offer_engagement WHERE id=NEW."engagementId" AND "userId"=NEW."userId";
    IF recipient."offerId" IS DISTINCT FROM terms."offerId" OR NEW."companyId" IS DISTINCT FROM recipient."companyId" OR NEW."personId" IS DISTINCT FROM recipient."personId" THEN RAISE EXCEPTION 'Receipt recipient mismatch' USING ERRCODE='23514'; END IF;
   ELSIF NEW."companyId" IS DISTINCT FROM terms."companyId" OR NEW."personId" IS DISTINCT FROM terms."personId" THEN RAISE EXCEPTION 'Receipt terms recipient mismatch' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER offer_revision_recipient BEFORE INSERT OR UPDATE ON offer_revision FOR EACH ROW EXECUTE FUNCTION entrepreneurship_recipient_integrity();
CREATE TRIGGER business_receipt_recipient BEFORE INSERT OR UPDATE ON business_receipt_allocation FOR EACH ROW EXECUTE FUNCTION entrepreneurship_recipient_integrity();

COMMIT;
