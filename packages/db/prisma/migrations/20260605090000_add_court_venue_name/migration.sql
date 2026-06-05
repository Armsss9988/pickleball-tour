ALTER TABLE "courts" ADD COLUMN "venue_name" TEXT;

DROP INDEX IF EXISTS "courts_tournament_id_name_key";

CREATE INDEX IF NOT EXISTS "courts_tournament_id_venue_name_idx"
  ON "courts"("tournament_id", "venue_name");
