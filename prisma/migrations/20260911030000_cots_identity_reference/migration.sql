-- Preserve the explicitly selected disambiguation reference in its immutable discovery context.
ALTER TABLE "season_cots_context" ADD COLUMN "sourceEntityId" TEXT;
