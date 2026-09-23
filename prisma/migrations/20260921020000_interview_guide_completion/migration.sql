-- A null currentQuestionId means either "not started" or "finished". Preserve
-- that distinction so a completed guide never jumps back to question one.
ALTER TABLE "interview_session"
ADD COLUMN "guideCompletedAt" TIMESTAMP(3);
