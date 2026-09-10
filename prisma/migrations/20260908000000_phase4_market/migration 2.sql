-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niche" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "scope" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'EXPLORING',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_niche" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nicheId" TEXT NOT NULL,

    CONSTRAINT "company_niche_pkey" PRIMARY KEY ("companyId","nicheId")
);

-- CreateTable
CREATE TABLE "niche_decision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nicheId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "scopeSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "niche_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_capture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_capture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_userId_createdAt_id_idx" ON "company"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "company_id_userId_key" ON "company"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_userId_normalizedName_key" ON "company"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "niche_id_userId_key" ON "niche"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "niche_userId_normalizedName_key" ON "niche"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "niche_decision_nicheId_createdAt_idx" ON "niche_decision"("nicheId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_capture_id_userId_key" ON "business_capture"("id", "userId");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niche" ADD CONSTRAINT "niche_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_niche" ADD CONSTRAINT "company_niche_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_niche" ADD CONSTRAINT "company_niche_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niche_decision" ADD CONSTRAINT "niche_decision_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_capture" ADD CONSTRAINT "business_capture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
