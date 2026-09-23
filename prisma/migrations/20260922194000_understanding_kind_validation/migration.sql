ALTER TABLE "exploration_claim_revision" DROP CONSTRAINT "exploration_claim_revision_values";
ALTER TABLE "exploration_claim_revision" ADD CONSTRAINT "exploration_claim_revision_values" CHECK (version > 0 AND lane IN ('B2C', 'B2B', 'CROSS_MARKET') AND kind IN ('OBSERVED', 'INTERPRETATION', 'DECISION', 'CONTRADICTION') AND length(trim(statement)) > 0);
ALTER TABLE "exploration_uncertainty_revision" ADD CONSTRAINT "exploration_uncertainty_kind_values" CHECK (kind IN ('QUESTION','HYPOTHESIS'));
