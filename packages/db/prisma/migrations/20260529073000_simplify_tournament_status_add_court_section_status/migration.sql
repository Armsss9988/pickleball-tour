-- Map existing statuses to DRAFT or PUBLISHED first
UPDATE "tournaments" SET "status" = 'DRAFT' WHERE "status" != 'PUBLISHED';

-- CreateEnum
CREATE TYPE "SectionStatusEnum" AS ENUM ('EMPTY', 'VALID', 'INVALID', 'NEEDS_REVIEW');

-- AlterEnum
BEGIN;
CREATE TYPE "TournamentStatus_new" AS ENUM ('DRAFT', 'PUBLISHED');
ALTER TABLE "tournaments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tournaments" ALTER COLUMN "status" TYPE "TournamentStatus_new" USING ("status"::text::"TournamentStatus_new");
ALTER TYPE "TournamentStatus" RENAME TO "TournamentStatus_old";
ALTER TYPE "TournamentStatus_new" RENAME TO "TournamentStatus";
DROP TYPE "TournamentStatus_old";
ALTER TABLE "tournaments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "court_id" TEXT;

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_section_statuses" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "status" "SectionStatusEnum" NOT NULL DEFAULT 'EMPTY',
    "validated_at" TIMESTAMP(3),
    "error_details" JSONB DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_section_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courts_tournament_id_name_key" ON "courts"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_section_statuses_tournament_id_section_key_key" ON "tournament_section_statuses"("tournament_id", "section_key");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_section_statuses" ADD CONSTRAINT "tournament_section_statuses_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
