-- AlterTable
ALTER TABLE "tournament_rulesets" ADD COLUMN     "require_court_config" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "require_schedule_config" BOOLEAN NOT NULL DEFAULT true;
