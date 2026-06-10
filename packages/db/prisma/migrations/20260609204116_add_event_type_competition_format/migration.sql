-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SINGLES', 'DOUBLES', 'TEAM_EVENT');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('ROUND_ROBIN', 'KNOCKOUT', 'GROUP_STAGE_KNOCKOUT', 'SWISS');

-- AlterTable
ALTER TABLE "tournament_rulesets" ADD COLUMN     "competition_format" "CompetitionFormat" NOT NULL DEFAULT 'GROUP_STAGE_KNOCKOUT',
ADD COLUMN     "event_type" "EventType" NOT NULL DEFAULT 'TEAM_EVENT';
