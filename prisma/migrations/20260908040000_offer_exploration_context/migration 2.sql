-- Explicit participation only. Existing offers are intentionally not backfilled.
CREATE TABLE "offer_niche" (
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "nicheSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_niche_pkey" PRIMARY KEY ("offerId", "nicheId"),
  CONSTRAINT "offer_niche_offerId_userId_fkey" FOREIGN KEY ("offerId", "userId") REFERENCES "offer"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "offer_niche_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "offer_niche_userId_nicheId_idx" ON "offer_niche"("userId", "nicheId");
