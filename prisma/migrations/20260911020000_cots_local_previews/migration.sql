-- AlterTable
ALTER TABLE "season_media" ADD COLUMN     "hasAlpha" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previewStorageKey" TEXT;
