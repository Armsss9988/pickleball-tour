# 04 — Database Schema

Target database: PostgreSQL.

Naming convention:

* Tables: snake_case plural.
* Primary key: `id uuid`.
* Timestamps: `created_at`, `updated_at`.
* Soft delete optional: `deleted_at`.
* Multi-tenant-ready: important tables include `organization_id`.
## 1. Enums

```sql
create type user_status as enum ('active', 'disabled', 'pending');
create type gender as enum ('male', 'female', 'other', 'unknown');
create type claim_status as enum ('unclaimed', 'claimed', 'pending_claim');
create type registration_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
create type registration_source as enum ('admin_import', 'manual_admin', 'self_register');
create type tournament_status as enum (
  'draft',
  'player_import',
  'players_ready',
  'team_draw_completed',
  'group_assigned',
  'schedule_generated',
  'running',
  'group_completed',
  'knockout_generated',
  'knockout_running',
  'completed',
  'published'
);
create type team_member_role as enum ('captain', 'member');
create type draw_status as enum ('preview', 'confirmed', 'cancelled');
create type stage_type as enum ('group', 'playoff', 'semifinal', 'final', 'third_place', 'custom');
create type match_status as enum ('scheduled', 'lineup_pending', 'lineup_ready', 'ready', 'running', 'segment_break', 'completed', 'result_confirmed', 'cancelled');
create type segment_status as enum ('pending', 'running', 'completed', 'skipped');
create type lineup_status as enum ('draft', 'submitted', 'valid', 'invalid', 'locked');
```

## 2. Identity tables

### 2.1 organizations

```sql
create table organizations (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  branding_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.2 users

Only login accounts. VĐV may not have a user account initially.

```sql
create table users (
  id uuid primary key,
  organization_id uuid references organizations(id),
  email text unique,
  phone text,
  password_hash text,
  display_name text not null,
  avatar_url text,
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.3 user_roles

```sql
create table user_roles (
  id uuid primary key,
  user_id uuid not null references users(id),
  role text not null,
  organization_id uuid references organizations(id),
  tournament_id uuid,
  team_id uuid,
  created_at timestamptz not null default now()
);

create index idx_user_roles_user on user_roles(user_id);
create index idx_user_roles_scope on user_roles(organization_id, tournament_id, team_id);
```

## 3. Tournament tables

### 3.1 tournaments

```sql
create table tournaments (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  name text not null,
  slug text not null,
  description text,
  venue_name text,
  opening_time timestamptz,
  registration_deadline timestamptz,
  status tournament_status not null default 'draft',
  public_enabled boolean not null default false,
  ruleset_id uuid,
  metadata jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
```

### 3.2 tournament_rulesets

```sql
create table tournament_rulesets (
  id uuid primary key,
  organization_id uuid references organizations(id),
  tournament_id uuid references tournaments(id),
  name text not null,
  version int not null default 1,
  sport text not null default 'pickleball',
  config jsonb not null,
  is_template boolean not null default false,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tournaments
  add constraint fk_tournaments_ruleset
  foreign key (ruleset_id) references tournament_rulesets(id);
```

## 4. Player and registration tables

### 4.1 player_profiles

Player profile can exist without user account.

```sql
create table player_profiles (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  user_id uuid references users(id),
  full_name text not null,
  normalized_name text not null,
  gender gender not null default 'unknown',
  phone text,
  note text,
  source text not null default 'admin_import',
  claim_status claim_status not null default 'unclaimed',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_player_profiles_org on player_profiles(organization_id);
create index idx_player_profiles_name on player_profiles(normalized_name);
create index idx_player_profiles_user on player_profiles(user_id);
```

### 4.2 tournament_registrations

```sql
create table tournament_registrations (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  player_profile_id uuid not null references player_profiles(id),
  status registration_status not null default 'approved',
  source registration_source not null default 'admin_import',
  seed_no int,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_profile_id)
);

create index idx_tournament_registrations_tournament on tournament_registrations(tournament_id);
create index idx_tournament_registrations_player on tournament_registrations(player_profile_id);
```

## 5. Team tables

### 5.1 teams

```sql
create table teams (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  name text not null,
  code text not null,
  captain_player_id uuid references player_profiles(id),
  status text not null default 'active',
  seed_no int,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, code)
);
```

### 5.2 team_members

```sql
create table team_members (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  team_id uuid not null references teams(id),
  player_profile_id uuid not null references player_profiles(id),
  role team_member_role not null default 'member',
  joined_method text not null default 'random_draw',
  created_at timestamptz not null default now(),
  unique (tournament_id, player_profile_id),
  unique (team_id, player_profile_id)
);

create index idx_team_members_team on team_members(team_id);
```

### 5.3 team_draws

```sql
create table team_draws (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  status draw_status not null default 'preview',
  random_seed text not null,
  algorithm_version text not null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  created_by uuid references users(id),
  confirmed_by uuid references users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
```

## 6. Stage, group, schedule tables

### 6.1 stages

```sql
create table stages (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  name text not null,
  type stage_type not null,
  order_no int not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.2 groups

```sql
create table groups (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  stage_id uuid not null references stages(id),
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, code)
);
```

### 6.3 group_teams

```sql
create table group_teams (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  group_id uuid not null references groups(id),
  team_id uuid not null references teams(id),
  seed_order int,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_id),
  unique (group_id, team_id)
);
```

## 7. Match tables

### 7.1 matches

```sql
create table matches (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  stage_id uuid not null references stages(id),
  group_id uuid references groups(id),
  round_no int,
  match_no int,
  label text,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  scheduled_time timestamptz,
  court_name text,
  status match_status not null default 'scheduled',
  winner_team_id uuid references teams(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_matches_tournament on matches(tournament_id);
create index idx_matches_group on matches(group_id);
create index idx_matches_status on matches(status);
```

### 7.2 match_segments

```sql
create table match_segments (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  match_id uuid not null references matches(id),
  segment_order int not null,
  segment_key text not null,
  name text not null,
  target_score int not null,
  status segment_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (match_id, segment_order),
  unique (match_id, segment_key)
);
```

### 7.3 match_lineups

One row per match, segment, team.

```sql
create table match_lineups (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  match_id uuid not null references matches(id),
  segment_id uuid not null references match_segments(id),
  team_id uuid not null references teams(id),
  status lineup_status not null default 'draft',
  validation_result jsonb not null default '{}',
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, team_id)
);
```

### 7.4 match_lineup_players

```sql
create table match_lineup_players (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  match_lineup_id uuid not null references match_lineups(id),
  player_profile_id uuid not null references player_profiles(id),
  slot_no int,
  created_at timestamptz not null default now(),
  unique (match_lineup_id, player_profile_id)
);
```

### 7.5 score_events

```sql
create table score_events (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  match_id uuid not null references matches(id),
  segment_id uuid not null references match_segments(id),
  scoring_team_id uuid not null references teams(id),
  score_a_after int not null,
  score_b_after int not null,
  event_no int not null,
  is_undone boolean not null default false,
  undone_by uuid references users(id),
  undone_at timestamptz,
  undo_reason text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (match_id, event_no)
);

create index idx_score_events_match on score_events(match_id, event_no);
create index idx_score_events_segment on score_events(segment_id);
```

### 7.6 match_results

```sql
create table match_results (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  match_id uuid not null references matches(id),
  team_a_id uuid not null references teams(id),
  team_b_id uuid not null references teams(id),
  winner_team_id uuid not null references teams(id),
  team_a_score int not null,
  team_b_score int not null,
  confirmed_by uuid references users(id),
  confirmed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (match_id)
);
```

## 8. Ranking and bracket tables

### 8.1 standings

```sql
create table standings (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  group_id uuid not null references groups(id),
  team_id uuid not null references teams(id),
  matches_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  points_for int not null default 0,
  points_against int not null default 0,
  point_diff int not null default 0,
  rank int,
  tie_break_detail jsonb not null default '{}',
  calculated_at timestamptz not null default now(),
  unique (group_id, team_id)
);
```

### 8.2 bracket_nodes

```sql
create table bracket_nodes (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  stage_id uuid not null references stages(id),
  node_key text not null,
  round_name text not null,
  match_id uuid references matches(id),
  source_a text,
  source_b text,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  winner_to_node_key text,
  loser_award_key text,
  order_no int,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (tournament_id, node_key)
);
```

## 9. Award tables

```sql
create table awards (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  title text not null,
  award_key text not null,
  rank int,
  team_award jsonb not null default '{}',
  individual_award jsonb not null default '{}',
  cash_amount numeric,
  sponsor_gift_description text,
  recipient_rule text not null default 'ALL_TEAM_MEMBERS',
  created_at timestamptz not null default now(),
  unique (tournament_id, award_key)
);

create table award_recipients (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  tournament_id uuid not null references tournaments(id),
  award_id uuid not null references awards(id),
  team_id uuid references teams(id),
  player_profile_id uuid references player_profiles(id),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
```

## 10. Audit log

```sql
create table audit_logs (
  id uuid primary key,
  organization_id uuid references organizations(id),
  tournament_id uuid references tournaments(id),
  actor_user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_tournament on audit_logs(tournament_id, created_at desc);
create index idx_audit_logs_actor on audit_logs(actor_user_id, created_at desc);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
```

## 11. Recommended constraints beyond SQL

Some rules are too complex for DB constraints and should live in domain/service validation:

* Each team exactly 3 male + 2 female.
* Group exactly 4 teams.
* Lineup all 5 players must play.
* Male player max one segment.
* Segment target transitions.
* Ranking tie-breaker.
## 12. Indexing checklist

Add indexes for:

* `organization_id` on major tables.
* `tournament_id` on all tournament-scoped tables.
* `match_id` on match-related tables.
* `group_id` on standings/matches.
* `team_id` on team members and match refs.
## 13. Future migrations

Later features can add:

* `player_claim_requests`.
* `payments`.
* `subscriptions`.
* `player_ratings`.
* `notifications`.
* `media_assets`.
* `sponsor_slots`.
