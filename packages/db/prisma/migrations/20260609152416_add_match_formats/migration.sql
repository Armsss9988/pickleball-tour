-- AlterTable
ALTER TABLE "match_results" ADD COLUMN     "set_scores" JSONB,
ADD COLUMN     "sets_won_a" INTEGER,
ADD COLUMN     "sets_won_b" INTEGER;

-- AlterTable
ALTER TABLE "scoring_configs" ADD COLUMN     "deuce_max_score" INTEGER,
ADD COLUMN     "game_point_score" INTEGER,
ADD COLUMN     "last_set_point_score" INTEGER,
ADD COLUMN     "sets_to_win" INTEGER DEFAULT 2;

-- AlterTable
ALTER TABLE "tournament_rulesets" ADD COLUMN     "match_format" TEXT NOT NULL DEFAULT 'relay';
