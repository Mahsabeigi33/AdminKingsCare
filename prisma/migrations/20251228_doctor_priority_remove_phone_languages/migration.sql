-- Drop phone and languages, add priority to Doctor
ALTER TABLE "Doctor" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Doctor" DROP COLUMN IF EXISTS "languages";
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "priority" INTEGER;
