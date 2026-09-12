ALTER TABLE "content_variant"
  ADD COLUMN "scriptDocument" JSONB,
  ADD COLUMN "scriptVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "scriptSavedAt" TIMESTAMP(3);

CREATE TABLE "content_script_image" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_script_image_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_script_image_variantId_contentId_userId_fkey"
    FOREIGN KEY ("variantId", "contentId", "userId")
    REFERENCES "content_variant"("id", "contentId", "userId")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "content_script_image_storageKey_key" ON "content_script_image"("storageKey");
CREATE INDEX "content_script_image_variantId_userId_idx" ON "content_script_image"("variantId", "userId");
