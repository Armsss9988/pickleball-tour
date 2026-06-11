-- AlterTable
ALTER TABLE "tournament_rulesets" ADD COLUMN     "knockout_bracket_size" INTEGER,
ADD COLUMN     "knockout_seed_slots" JSONB;
