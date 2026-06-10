# 11 — RBAC and Audit

## 1. Roles

MVP roles:

|Role|Description|
|---|---|
|platform_owner|Full system owner|
|organization_admin|Admin of GOLAB organization|
|tournament_admin|Admin for one tournament|
|scorer|Can operate match scoring|
|captain|Optional, can submit lineup for own team|
|public_viewer|No login, read public data only|

## 2. Permissions

Use permission checks in backend, not only frontend.

```txt
TOURNAMENT_READ
TOURNAMENT_CREATE
TOURNAMENT_UPDATE
TOURNAMENT_PUBLISH
PLAYER_READ
PLAYER_IMPORT
PLAYER_UPDATE
PLAYER_DELETE
TEAM_DRAW_PREVIEW
TEAM_DRAW_CONFIRM
TEAM_UPDATE
GROUP_ASSIGN
SCHEDULE_GENERATE
SCHEDULE_UPDATE
LINEUP_READ
LINEUP_SUBMIT
LINEUP_VALIDATE
LINEUP_LOCK
MATCH_READ
MATCH_START
MATCH_SCORE_UPDATE
MATCH_SCORE_UNDO
MATCH_RESULT_CONFIRM
STANDING_READ
STANDING_RECALCULATE
BRACKET_GENERATE
AWARD_GENERATE
AUDIT_READ
```

## 3. Role-permission matrix

|Permission|Platform|Org Admin|Tournament Admin|Scorer|Captain|
|---|---|---|---|---|---|
|TOURNAMENT_READ|yes|yes|yes|yes|yes|
|TOURNAMENT_CREATE|yes|yes|no|no|no|
|TOURNAMENT_UPDATE|yes|yes|yes|no|no|
|PLAYER_IMPORT|yes|yes|yes|no|no|
|TEAM_DRAW_CONFIRM|yes|yes|yes|no|no|
|GROUP_ASSIGN|yes|yes|yes|no|no|
|SCHEDULE_GENERATE|yes|yes|yes|no|no|
|LINEUP_SUBMIT|yes|yes|yes|yes|own team only|
|LINEUP_LOCK|yes|yes|yes|yes|no|
|MATCH_START|yes|yes|yes|yes|no|
|MATCH_SCORE_UPDATE|yes|yes|yes|yes|no|
|MATCH_SCORE_UNDO|yes|yes|yes|yes|no|
|MATCH_RESULT_CONFIRM|yes|yes|yes|yes|no|
|BRACKET_GENERATE|yes|yes|yes|no|no|
|AWARD_GENERATE|yes|yes|yes|no|no|
|AUDIT_READ|yes|yes|yes|no|no|

## 4. Scope checks

Roles can be scoped:

* Organization scope.
* Tournament scope.
* Team scope.
Example:

```json
{
  "userId": "uuid",
  "role": "scorer",
  "organizationId": "golab_org_id",
  "tournamentId": "golab_tournament_id"
}
```

Captain role should include `team_id` if implemented.

## 5. Public access

Public APIs require:

* Tournament `public_enabled = true`.
* Only public-safe fields.
Never expose:

* User email.
* Password hash.
* Internal notes.
* Phone by default.
* Audit details.
## 6. Audit log principles

Audit logs must be append-only.

Every sensitive mutation should create an audit log.

Audit log should answer:

* Who did it?
* What action?
* Which entity?
* Before data?
* After data?
* When?
* Why, if override?
## 7. Required audit actions

### Player

```txt
PLAYERS_IMPORTED
PLAYER_CREATED
PLAYER_UPDATED
PLAYER_REMOVED_FROM_TOURNAMENT
PLAYERS_VALIDATED
```

### Team draw

```txt
TEAM_DRAW_PREVIEW_CREATED
TEAM_DRAW_CONFIRMED
TEAM_DRAW_CANCELLED
TEAM_MANUALLY_UPDATED
CAPTAIN_ASSIGNED
```

### Group and schedule

```txt
GROUP_ASSIGNMENT_CONFIRMED
GROUP_ASSIGNMENT_UPDATED
SCHEDULE_GENERATED
MATCH_SCHEDULE_UPDATED
```

### Lineup

```txt
MATCH_SEGMENT_ORDER_DRAWN
MATCH_SEGMENT_ORDER_MANUALLY_SET
LINEUP_SUBMITTED
LINEUP_VALIDATED
LINEUP_LOCKED
LINEUP_UPDATED_AFTER_LOCK
```

### Scoring

```txt
MATCH_STARTED
SCORE_EVENT_CREATED
SCORE_EVENT_UNDONE
SEGMENT_COMPLETED
MATCH_COMPLETED
MATCH_RESULT_CONFIRMED
MATCH_RESULT_OVERRIDDEN
```

### Ranking and bracket

```txt
STANDINGS_RECALCULATED
TIE_BREAK_ADMIN_DECISION
GROUP_STAGE_COMPLETED
BRACKET_GENERATED
BRACKET_ADVANCED
AWARDS_GENERATED
```

## 8. Override rules

The following actions require reason:

* Editing confirmed teams.
* Editing locked lineup.
* Undoing score.
* Overriding confirmed match result.
* Resolving unresolved tie manually.
* Regenerating bracket after matches exist.
Reason must be non-empty.

## 9. Audit data format

```ts
type AuditLog = {
  id: string;
  organizationId?: string;
  tournamentId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};
```

## 10. Example audit log

```json
{
  "action": "SCORE_EVENT_UNDONE",
  "entityType": "score_event",
  "entityId": "event_uuid",
  "beforeData": {
    "scoreAAfter": 16,
    "scoreBAfter": 12,
    "isUndone": false
  },
  "afterData": {
    "isUndone": true
  },
  "reason": "Trọng tài nhập nhầm điểm",
  "actorUserId": "scorer_uuid",
  "createdAt": "2026-06-14T10:30:00+07:00"
}
```

## 11. Security checklist

* Hash passwords with bcrypt/argon2.
* Never return password hash.
* Validate all params belong to same organization/tournament.
* Use transaction for multi-step mutations.
* Use optimistic locking or row lock for scoring.
* Rate-limit login.
* Only allow scoring from authorized users.
* Public endpoints read-only.
## 12. Concurrency concern for scoring

Two devices should not add points simultaneously without consistency.

Recommended:

* Use DB transaction.
* Lock match row or use advisory lock by match ID.
* Determine next `event_no` inside transaction.
* Insert score event.
* Update match/segment state.
Pseudo:

```sql
begin;
select * from matches where id = $1 for update;
-- calculate and insert score event
commit;
```

