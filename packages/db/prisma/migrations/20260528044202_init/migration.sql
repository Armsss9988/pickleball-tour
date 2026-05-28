-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'PENDING_CLAIM');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('ADMIN_IMPORT', 'MANUAL_ADMIN', 'SELF_REGISTER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PLAYER_IMPORT', 'PLAYERS_READY', 'TEAM_DRAW_COMPLETED', 'GROUP_ASSIGNED', 'SCHEDULE_GENERATED', 'RUNNING', 'GROUP_COMPLETED', 'KNOCKOUT_GENERATED', 'KNOCKOUT_RUNNING', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('CAPTAIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('PREVIEW', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('GROUP', 'PLAYOFF', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LINEUP_PENDING', 'LINEUP_READY', 'READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED', 'RESULT_CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SegmentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LineupStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALID', 'INVALID', 'LOCKED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "branding_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization_id" TEXT,
    "tournament_id" TEXT,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "venue_name" TEXT,
    "opening_time" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3),
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "public_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ruleset_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rulesets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sport" TEXT NOT NULL DEFAULT 'pickleball',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_rulesets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_definitions" (
    "id" TEXT NOT NULL,
    "ruleset_id" TEXT NOT NULL,
    "segment_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_score" INTEGER NOT NULL,
    "player_count" INTEGER NOT NULL,
    "gender_rule" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_drawable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "segment_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_composition_rules" (
    "id" TEXT NOT NULL,
    "ruleset_id" TEXT NOT NULL,
    "team_size" INTEGER NOT NULL,
    "male_count" INTEGER NOT NULL,
    "female_count" INTEGER NOT NULL,
    "all_must_play" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "team_composition_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_limit_rules" (
    "id" TEXT NOT NULL,
    "ruleset_id" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "min_segments" INTEGER NOT NULL,
    "max_segments" INTEGER NOT NULL,

    CONSTRAINT "player_limit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overlap_rules" (
    "id" TEXT NOT NULL,
    "ruleset_id" TEXT NOT NULL,
    "segment_a_key" TEXT NOT NULL,
    "segment_b_key" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "is_forbidden" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "overlap_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" TEXT NOT NULL,
    "ruleset_id" TEXT NOT NULL,
    "win_score" INTEGER NOT NULL,
    "no_deuce" BOOLEAN NOT NULL DEFAULT true,
    "side_switch_after_segments" INTEGER NOT NULL DEFAULT 0,
    "points_for_win" INTEGER NOT NULL DEFAULT 3,
    "points_for_loss" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "phone" TEXT,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin_import',
    "claim_status" "ClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_registrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "player_profile_id" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'APPROVED',
    "source" "RegistrationSource" NOT NULL DEFAULT 'ADMIN_IMPORT',
    "seed_no" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "captain_player_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "seed_no" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_profile_id" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_method" TEXT NOT NULL DEFAULT 'random_draw',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_draws" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'PREVIEW',
    "random_seed" TEXT NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "output_snapshot" JSONB NOT NULL,
    "created_by" TEXT,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL,
    "order_no" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "seed_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "group_id" TEXT,
    "round_no" INTEGER,
    "match_no" INTEGER,
    "label" TEXT,
    "team_a_id" TEXT,
    "team_b_id" TEXT,
    "scheduled_time" TIMESTAMP(3),
    "court_name" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winner_team_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "segment_order" INTEGER NOT NULL,
    "segment_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_score" INTEGER NOT NULL,
    "status" "SegmentStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" "LineupStatus" NOT NULL DEFAULT 'DRAFT',
    "validation_result" JSONB NOT NULL DEFAULT '{}',
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineup_players" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "match_lineup_id" TEXT NOT NULL,
    "player_profile_id" TEXT NOT NULL,
    "slot_no" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_lineup_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "scoring_team_id" TEXT NOT NULL,
    "score_a_after" INTEGER NOT NULL,
    "score_b_after" INTEGER NOT NULL,
    "event_no" INTEGER NOT NULL,
    "is_undone" BOOLEAN NOT NULL DEFAULT false,
    "undone_by" TEXT,
    "undone_at" TIMESTAMP(3),
    "undo_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "team_a_id" TEXT NOT NULL,
    "team_b_id" TEXT NOT NULL,
    "winner_team_id" TEXT NOT NULL,
    "team_a_score" INTEGER NOT NULL,
    "team_b_score" INTEGER NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "points_for" INTEGER NOT NULL DEFAULT 0,
    "points_against" INTEGER NOT NULL DEFAULT 0,
    "point_diff" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "tie_break_detail" JSONB NOT NULL DEFAULT '{}',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_nodes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "node_key" TEXT NOT NULL,
    "round_name" TEXT NOT NULL,
    "match_id" TEXT,
    "source_a" TEXT,
    "source_b" TEXT,
    "team_a_id" TEXT,
    "team_b_id" TEXT,
    "winner_to_node_key" TEXT,
    "loser_award_key" TEXT,
    "order_no" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "award_key" TEXT NOT NULL,
    "rank" INTEGER,
    "team_award" JSONB NOT NULL DEFAULT '{}',
    "individual_award" JSONB NOT NULL DEFAULT '{}',
    "cash_amount" DECIMAL(65,30),
    "sponsor_gift_description" TEXT,
    "recipient_rule" TEXT NOT NULL DEFAULT 'ALL_TEAM_MEMBERS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_recipients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "team_id" TEXT,
    "player_profile_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "tournament_id" TEXT,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_organization_id_tournament_id_team_id_idx" ON "user_roles"("organization_id", "tournament_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_organization_id_slug_key" ON "tournaments"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "segment_definitions_ruleset_id_segment_key_key" ON "segment_definitions"("ruleset_id", "segment_key");

-- CreateIndex
CREATE UNIQUE INDEX "team_composition_rules_ruleset_id_key" ON "team_composition_rules"("ruleset_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_limit_rules_ruleset_id_gender_key" ON "player_limit_rules"("ruleset_id", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "overlap_rules_ruleset_id_segment_a_key_segment_b_key_gender_key" ON "overlap_rules"("ruleset_id", "segment_a_key", "segment_b_key", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_configs_ruleset_id_key" ON "scoring_configs"("ruleset_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_user_id_key" ON "player_profiles"("user_id");

-- CreateIndex
CREATE INDEX "player_profiles_organization_id_idx" ON "player_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "player_profiles_normalized_name_idx" ON "player_profiles"("normalized_name");

-- CreateIndex
CREATE INDEX "tournament_registrations_tournament_id_idx" ON "tournament_registrations"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_registrations_player_profile_id_idx" ON "tournament_registrations"("player_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_registrations_tournament_id_player_profile_id_key" ON "tournament_registrations"("tournament_id", "player_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tournament_id_code_key" ON "teams"("tournament_id", "code");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_tournament_id_player_profile_id_key" ON "team_members"("tournament_id", "player_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_player_profile_id_key" ON "team_members"("team_id", "player_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_tournament_id_code_key" ON "groups"("tournament_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "group_teams_tournament_id_team_id_key" ON "group_teams"("tournament_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_teams_group_id_team_id_key" ON "group_teams"("group_id", "team_id");

-- CreateIndex
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_group_id_idx" ON "matches"("group_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "match_segments_match_id_segment_order_key" ON "match_segments"("match_id", "segment_order");

-- CreateIndex
CREATE UNIQUE INDEX "match_segments_match_id_segment_key_key" ON "match_segments"("match_id", "segment_key");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineups_segment_id_team_id_key" ON "match_lineups"("segment_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineup_players_match_lineup_id_player_profile_id_key" ON "match_lineup_players"("match_lineup_id", "player_profile_id");

-- CreateIndex
CREATE INDEX "score_events_match_id_event_no_idx" ON "score_events"("match_id", "event_no");

-- CreateIndex
CREATE INDEX "score_events_segment_id_idx" ON "score_events"("segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_events_match_id_event_no_key" ON "score_events"("match_id", "event_no");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_match_id_key" ON "match_results"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_group_id_team_id_key" ON "standings"("group_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_nodes_match_id_key" ON "bracket_nodes"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_nodes_tournament_id_node_key_key" ON "bracket_nodes"("tournament_id", "node_key");

-- CreateIndex
CREATE UNIQUE INDEX "awards_tournament_id_award_key_key" ON "awards"("tournament_id", "award_key");

-- CreateIndex
CREATE INDEX "audit_logs_tournament_id_created_at_idx" ON "audit_logs"("tournament_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rulesets" ADD CONSTRAINT "tournament_rulesets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rulesets" ADD CONSTRAINT "tournament_rulesets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_definitions" ADD CONSTRAINT "segment_definitions_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_composition_rules" ADD CONSTRAINT "team_composition_rules_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_limit_rules" ADD CONSTRAINT "player_limit_rules_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overlap_rules" ADD CONSTRAINT "overlap_rules_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_configs" ADD CONSTRAINT "scoring_configs_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "tournament_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_player_profile_id_fkey" FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_player_id_fkey" FOREIGN KEY ("captain_player_id") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_player_profile_id_fkey" FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_draws" ADD CONSTRAINT "team_draws_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_draws" ADD CONSTRAINT "team_draws_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_draws" ADD CONSTRAINT "team_draws_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_draws" ADD CONSTRAINT "team_draws_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_segments" ADD CONSTRAINT "match_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_segments" ADD CONSTRAINT "match_segments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_segments" ADD CONSTRAINT "match_segments_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "match_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineup_players" ADD CONSTRAINT "match_lineup_players_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineup_players" ADD CONSTRAINT "match_lineup_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineup_players" ADD CONSTRAINT "match_lineup_players_match_lineup_id_fkey" FOREIGN KEY ("match_lineup_id") REFERENCES "match_lineups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineup_players" ADD CONSTRAINT "match_lineup_players_player_profile_id_fkey" FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "match_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_scoring_team_id_fkey" FOREIGN KEY ("scoring_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_undone_by_fkey" FOREIGN KEY ("undone_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_nodes" ADD CONSTRAINT "bracket_nodes_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_recipients" ADD CONSTRAINT "award_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_recipients" ADD CONSTRAINT "award_recipients_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_recipients" ADD CONSTRAINT "award_recipients_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "awards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_recipients" ADD CONSTRAINT "award_recipients_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_recipients" ADD CONSTRAINT "award_recipients_player_profile_id_fkey" FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
