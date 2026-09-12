BEGIN;

ALTER TABLE direction_criterion DROP CONSTRAINT criterion_metric;
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_metric CHECK (
  metric IN (
    'MANUAL', 'WORK_SOURCE_INCOME', 'BUSINESS_RECEIPTS',
    'NEW_RECURRING_COMPANY', 'CONVERSATIONS', 'CONVERSATION_COMPANIES',
    'SESSION_TIME', 'ENGINEERING_EVIDENCE', 'ENGINEERING_PROJECT_COMPLETED',
    'SAVINGS_GOAL'
  )
);

-- Completion is the current state of one owned canonical project.
-- The existing composite foreign key enforces ownership.
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_project_completion CHECK (
  metric <> 'ENGINEERING_PROJECT_COMPLETED' OR (
    "projectId" IS NOT NULL AND target = '' AND
    "startOn" IS NULL AND "endOn" IS NULL AND "evidenceType" IS NULL
  )
);

COMMIT;
