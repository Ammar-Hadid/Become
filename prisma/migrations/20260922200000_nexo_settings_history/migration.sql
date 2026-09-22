CREATE TABLE "nexo_settings_revision" (
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "version")
);
INSERT INTO "nexo_settings_revision" ("userId", "version", "config", "createdAt")
SELECT "userId", "version", "config", "updatedAt" FROM "nexo_settings";
