ALTER TABLE "tournament_rulesets"
ADD COLUMN "third_place_match_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "quick_score_entry_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "require_lineup" BOOLEAN NOT NULL DEFAULT true;
