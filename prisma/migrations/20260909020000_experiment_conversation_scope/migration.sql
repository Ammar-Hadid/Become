ALTER TABLE direction_criterion ADD COLUMN "selectedOutreachOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_outreach_scope CHECK (NOT "selectedOutreachOnly" OR ("experimentId" IS NOT NULL AND metric IN ('CONVERSATIONS','CONVERSATION_COMPANIES')));
