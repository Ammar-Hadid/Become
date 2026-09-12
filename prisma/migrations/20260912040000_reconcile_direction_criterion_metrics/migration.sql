BEGIN;

-- Phase 6 content measurements and Engineering project completion were added
-- in sibling migrations that each replaced this constraint. Reconcile the
-- final constraint so a fresh database accepts every supported metric.
ALTER TABLE direction_criterion DROP CONSTRAINT criterion_metric;
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_metric CHECK (
  metric IN (
    'MANUAL',
    'WORK_SOURCE_INCOME',
    'BUSINESS_RECEIPTS',
    'NEW_RECURRING_COMPANY',
    'CONVERSATIONS',
    'CONVERSATION_COMPANIES',
    'SESSION_TIME',
    'ENGINEERING_EVIDENCE',
    'ENGINEERING_PROJECT_COMPLETED',
    'SAVINGS_GOAL',
    'CONTENT_CREATED',
    'CONTENT_VARIANTS_CREATED',
    'CONTENT_PUBLICATIONS'
  )
);

COMMIT;
