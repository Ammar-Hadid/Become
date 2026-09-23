BEGIN;
-- SQL CHECK accepts NULL; make the individual-source requirement explicit.
ALTER TABLE offer_engagement DROP CONSTRAINT engagement_individual;
ALTER TABLE offer_engagement ADD CONSTRAINT engagement_individual CHECK (
  "identityKind" IN ('PERSON','BUSINESS','ANONYMOUS','UNSPECIFIED') AND
  ("personId" IS NOT NULL OR "companyId" IS NOT NULL OR COALESCE(length("audienceLabel"),0)>0)
);
ALTER TABLE business_receipt_allocation ADD CONSTRAINT receipt_engagement_terms CHECK ("engagementId" IS NULL OR "offerRevisionId" IS NOT NULL);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['interaction_revision','observation_revision','offer','offer_revision','offer_engagement','problem','business_receipt_allocation'] LOOP
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK ("identityKind" IN (''UNSPECIFIED'',''PERSON'',''BUSINESS'',''ANONYMOUS'',''GROUP'') AND ("identityKind" NOT IN (''ANONYMOUS'',''GROUP'') OR ("personId" IS NULL AND "companyId" IS NULL)))',t,t||'_audience_identity');
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION entrepreneurship_recipient_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_offer offer%ROWTYPE; recipient offer_engagement%ROWTYPE; terms offer_revision%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME IN ('offer_revision','offer_engagement') THEN
  SELECT * INTO owner_offer FROM offer WHERE id=NEW."offerId" AND "userId"=NEW."userId";
  IF owner_offer.mode='SPECIFIC' AND (NEW."companyId" IS DISTINCT FROM owner_offer."companyId" OR NEW."personId" IS DISTINCT FROM owner_offer."personId") THEN RAISE EXCEPTION 'Offer recipient mismatch' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='offer_revision' AND owner_offer.mode='AUDIENCE_TEST' AND (NEW."personId" IS NOT NULL OR NEW."companyId" IS NOT NULL) THEN RAISE EXCEPTION 'Audience terms cannot identify a recipient' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW."offerRevisionId" IS NOT NULL THEN
   SELECT * INTO terms FROM offer_revision WHERE id=NEW."offerRevisionId" AND "userId"=NEW."userId";
   SELECT * INTO owner_offer FROM offer WHERE id=terms."offerId" AND "userId"=NEW."userId";
   IF owner_offer.mode='AUDIENCE_TEST' AND NEW."engagementId" IS NULL THEN RAISE EXCEPTION 'Audience receipt requires a recipient engagement' USING ERRCODE='23514'; END IF;
   IF NEW."engagementId" IS NOT NULL THEN
    SELECT * INTO recipient FROM offer_engagement WHERE id=NEW."engagementId" AND "userId"=NEW."userId";
    IF recipient."offerId" IS DISTINCT FROM terms."offerId" OR NEW."companyId" IS DISTINCT FROM recipient."companyId" OR NEW."personId" IS DISTINCT FROM recipient."personId" THEN RAISE EXCEPTION 'Receipt recipient mismatch' USING ERRCODE='23514'; END IF;
   ELSIF NEW."companyId" IS DISTINCT FROM terms."companyId" OR NEW."personId" IS DISTINCT FROM terms."personId" THEN RAISE EXCEPTION 'Receipt terms recipient mismatch' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER offer_engagement_recipient BEFORE INSERT OR UPDATE ON offer_engagement FOR EACH ROW EXECUTE FUNCTION entrepreneurship_recipient_integrity();
-- Audience revisions use fresh snapshots. Only cascade deletion may remove them.
CREATE FUNCTION entrepreneurship_immutable_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Append a new captured audience context instead of modifying history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_audience_context BEFORE UPDATE ON audience_context FOR EACH ROW EXECUTE FUNCTION entrepreneurship_immutable_context();
CREATE TRIGGER immutable_audience_context_segment BEFORE UPDATE ON audience_context_segment FOR EACH ROW EXECUTE FUNCTION entrepreneurship_immutable_context();
COMMIT;
