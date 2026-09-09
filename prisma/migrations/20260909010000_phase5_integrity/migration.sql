-- Close PostgreSQL CHECK's NULL loophole; no existing data is transformed.
ALTER TABLE direction_criterion DROP CONSTRAINT criterion_money;
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_money CHECK (
  (metric IN ('WORK_SOURCE_INCOME','BUSINESS_RECEIPTS','NEW_RECURRING_COMPANY') AND "targetMinor" IS NOT NULL AND "targetMinor">0 AND currency IS NOT NULL AND currency ~ '^[A-Z]{3}$')
  OR (metric NOT IN ('WORK_SOURCE_INCOME','BUSINESS_RECEIPTS','NEW_RECURRING_COMPANY') AND "targetMinor" IS NULL AND currency IS NULL)
);
ALTER TABLE direction_goal ADD CONSTRAINT goal_outcome_required CHECK ((status='CONCLUDED')=(outcome IS NOT NULL));
ALTER TABLE experiment ADD CONSTRAINT experiment_outcome_required CHECK ((status='CONCLUDED')=(outcome IS NOT NULL));
ALTER TABLE direction_criterion ADD CONSTRAINT minimum_receipt_valid CHECK ("minimumReceivedMinor" IS NULL OR (metric='NEW_RECURRING_COMPANY' AND "minimumReceivedMinor">0));
