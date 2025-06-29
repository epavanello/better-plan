CREATE TYPE "public"."post_source" AS ENUM('native', 'imported');
ALTER TABLE "posts" DROP COLUMN "fail_count";
ALTER TABLE "posts" ADD COLUMN "fail_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "posts" ADD COLUMN "source" "post_source" DEFAULT 'native' NOT NULL;