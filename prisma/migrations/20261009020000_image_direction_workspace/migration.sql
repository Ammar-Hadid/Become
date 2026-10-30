ALTER TABLE "image_direction_template_version" ADD COLUMN "authoring" JSONB;
-- Retain the nullable legacy JSONB fields so existing draft data remains available.
