ALTER TABLE "image_direction_template_version" ADD COLUMN "authoring" JSONB;
ALTER TABLE "image_direction_template_version" DROP COLUMN "samplePreviews";
ALTER TABLE "living_season_pack" DROP COLUMN "imageDirectionStaging";
