-- Keep message-backed observation provenance inside one conversation thread.
-- The previous constraints already pinned the logical message and exact revision;
-- these composite keys additionally prove that both belong to interactionId.
ALTER TABLE "observation_revision"
DROP CONSTRAINT "observation_revision_source_message",
DROP CONSTRAINT "observation_revision_source_message_revision";

CREATE UNIQUE INDEX "conversation_message_revision_thread_logical"
ON "conversation_message_revision"("id", "messageId", "interactionId", "userId");

ALTER TABLE "observation_revision"
ADD CONSTRAINT "observation_revision_source_message"
FOREIGN KEY ("sourceMessageId", "interactionId", "userId")
REFERENCES "conversation_message"("id", "interactionId", "userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "observation_revision"
ADD CONSTRAINT "observation_revision_source_message_revision"
FOREIGN KEY ("sourceMessageRevisionId", "sourceMessageId", "interactionId", "userId")
REFERENCES "conversation_message_revision"("id", "messageId", "interactionId", "userId")
ON DELETE RESTRICT ON UPDATE CASCADE;
