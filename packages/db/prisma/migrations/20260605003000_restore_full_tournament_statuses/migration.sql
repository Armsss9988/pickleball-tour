-- Restore the full tournament status lifecycle after the temporary simplification.
BEGIN;
CREATE TYPE "TournamentStatus_new" AS ENUM (
    'DRAFT',
    'PLAYER_IMPORT',
    'PLAYERS_READY',
    'TEAM_DRAW_COMPLETED',
    'GROUP_ASSIGNED',
    'SCHEDULE_GENERATED',
    'RUNNING',
    'GROUP_COMPLETED',
    'KNOCKOUT_GENERATED',
    'KNOCKOUT_RUNNING',
    'COMPLETED',
    'PUBLISHED'
);
ALTER TABLE "tournaments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tournaments" ALTER COLUMN "status" TYPE "TournamentStatus_new" USING ("status"::text::"TournamentStatus_new");
ALTER TYPE "TournamentStatus" RENAME TO "TournamentStatus_old";
ALTER TYPE "TournamentStatus_new" RENAME TO "TournamentStatus";
DROP TYPE "TournamentStatus_old";
ALTER TABLE "tournaments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
