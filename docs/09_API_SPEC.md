# 09 — API Spec

Base path:

```txt
/api
```

Auth:

```txt
Authorization: Bearer <access_token>
```

## 1. Error response format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "code": "PLAYER_GENDER_REQUIRED",
        "path": "players[3].gender",
        "message": "VĐV cần có giới tính"
      }
    ]
  }
}
```

## 2. Auth APIs

### POST /auth/login

Request:

```json
{
  "email": "admin@golab.local",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "displayName": "Golab Admin",
    "roles": ["tournament_admin"]
  }
}
```

### GET /auth/me

Returns current user and permissions.

## 3. Tournament APIs

### GET /tournaments

Admin list tournaments.

### POST /tournaments

Create tournament.

Request:

```json
{
  "organizationId": "uuid",
  "name": "Giải Pickleball đồng đội Cúp Golab lần 2",
  "slug": "golab-cup-2",
  "venueName": "Cụm sân Pickleball Hùng Hà",
  "openingTime": "2026-06-14T08:00:00+07:00",
  "registrationDeadline": "2026-06-24T23:59:59+07:00"
}
```

Validation:

* Warn if registration deadline after opening time.
### GET /tournaments/:tournamentId

Get tournament detail.

### PATCH /tournaments/:tournamentId

Update tournament info.

### POST /tournaments/:tournamentId/publish

Enable public page.

## 4. Ruleset APIs

### GET /tournaments/:tournamentId/ruleset

Get current ruleset.

### PUT /tournaments/:tournamentId/ruleset

Update ruleset. Only allowed before operational data is generated, or requires override.

### POST /tournaments/:tournamentId/ruleset/validate

Validate ruleset config.

## 5. Player APIs

### GET /tournaments/:tournamentId/players

Query params:

```txt
search
 gender
 status
 page
 limit
```

Response:

```json
{
  "items": [
    {
      "id": "player_profile_id",
      "fullName": "Nguyễn Văn A",
      "gender": "male",
      "phone": null,
      "registrationStatus": "approved",
      "claimStatus": "unclaimed"
    }
  ],
  "total": 40
}
```

### POST /tournaments/:tournamentId/players

Add one player manually.

Request:

```json
{
  "fullName": "Nguyễn Văn A",
  "gender": "male",
  "phone": null,
  "note": null
}
```

### POST /tournaments/:tournamentId/players/import

MVP can accept JSON array first. CSV/Excel upload can be added later.

Request:

```json
{
  "players": [
    { "fullName": "Nguyễn Văn A", "gender": "male", "phone": null },
    { "fullName": "Trần Thị B", "gender": "female", "phone": null }
  ],
  "mode": "append"
}
```

Modes:

* `append`
* `replace_all`
Response:

```json
{
  "created": 40,
  "updated": 0,
  "warnings": []
}
```

### POST /tournaments/:tournamentId/players/validate

Response:

```json
{
  "valid": true,
  "summary": {
    "total": { "actual": 40, "required": 40 },
    "male": { "actual": 24, "required": 24 },
    "female": { "actual": 16, "required": 16 }
  },
  "errors": [],
  "warnings": []
}
```

## 6. Team draw APIs

### POST /tournaments/:tournamentId/team-draws/preview

Request:

```json
{
  "seed": "optional-user-provided-seed"
}
```

Response:

```json
{
  "drawId": "uuid",
  "seed": "20260614-GOLAB-XYZ",
  "algorithmVersion": "team-draw-v1",
  "teams": [
    {
      "tempTeamNo": 1,
      "name": "Đội 1",
      "players": [
        { "id": "uuid", "fullName": "...", "gender": "male" }
      ]
    }
  ]
}
```

### POST /tournaments/:tournamentId/team-draws/:drawId/confirm

Creates teams and team members.

### GET /tournaments/:tournamentId/team-draws

List draw history.

### GET /tournaments/:tournamentId/teams

List confirmed teams.

### PATCH /teams/:teamId

Update team name/captain.

## 7. Group APIs

### POST /tournaments/:tournamentId/groups/init

Creates Bảng A and B.

### PUT /tournaments/:tournamentId/groups/assignment

Request:

```json
{
  "groups": [
    { "code": "A", "teamIds": ["t1", "t2", "t3", "t4"] },
    { "code": "B", "teamIds": ["t5", "t6", "t7", "t8"] }
  ]
}
```

### POST /tournaments/:tournamentId/groups/random-assignment

Randomly assign teams to A/B.

### GET /tournaments/:tournamentId/groups

Get groups with teams.

## 8. Schedule APIs

### POST /tournaments/:tournamentId/schedule/generate-group-stage

Generates 12 group matches.

### GET /tournaments/:tournamentId/matches

Query params:

```txt
stageId
groupId
status
date
```

### PATCH /matches/:matchId/schedule

Request:

```json
{
  "scheduledTime": "2026-06-14T09:00:00+07:00",
  "courtName": "Sân 1",
  "matchNo": 1
}
```

## 9. Match lineup APIs

### POST /matches/:matchId/segments/draw-order

Draws content order and creates segments.

Request:

```json
{
  "seed": "optional"
}
```

Alternative manual:

### PUT /matches/:matchId/segments/order

```json
{
  "contentKeys": ["mixed_doubles", "mens_doubles", "womens_doubles"]
}
```

### GET /matches/:matchId/lineups

Get segments and selected players.

### PUT /matches/:matchId/lineups

Request:

```json
{
  "teamLineups": [
    {
      "teamId": "team_a_id",
      "segments": [
        {
          "segmentId": "segment_1_id",
          "playerIds": ["p1", "p2"]
        }
      ]
    }
  ]
}
```

### POST /matches/:matchId/lineups/validate

Returns validation result for both teams.

### POST /matches/:matchId/lineups/lock

Locks valid lineups.

## 10. Scoring APIs

### POST /matches/:matchId/start

Preconditions:

* Match ready.
* Valid locked lineups.
### POST /matches/:matchId/score-events

Add point.

Request:

```json
{
  "scoringTeamId": "uuid"
}
```

Response:

```json
{
  "eventId": "uuid",
  "score": { "teamA": 8, "teamB": 5 },
  "segmentStatus": "completed",
  "matchStatus": "segment_break",
  "transitions": ["SEGMENT_COMPLETED", "SEGMENT_BREAK_REQUIRED"]
}
```

### POST /matches/:matchId/score-events/undo-latest

Request:

```json
{
  "reason": "Nhập nhầm điểm"
}
```

### POST /matches/:matchId/segments/:segmentId/start-next

Starts next segment after side switch.

### POST /matches/:matchId/confirm-result

Confirms completed result.

## 11. Standings APIs

### GET /tournaments/:tournamentId/standings

Returns standings by group.

### POST /tournaments/:tournamentId/standings/recalculate

Admin/system recalculates standings.

### POST /tournaments/:tournamentId/group-stage/complete

Completes group stage if all group matches confirmed and no unresolved tie.

## 12. Bracket APIs

### POST /tournaments/:tournamentId/bracket/generate

Generate knockout bracket.

### GET /tournaments/:tournamentId/bracket

Get bracket.

## 13. Award APIs

### POST /tournaments/:tournamentId/awards/generate

Generate awards after final.

### GET /tournaments/:tournamentId/awards

Get award recipients.

## 14. Public APIs

Use `/public` prefix and no auth.

```txt
GET /public/tournaments/:slug
GET /public/tournaments/:slug/teams
GET /public/tournaments/:slug/groups
GET /public/tournaments/:slug/matches
GET /public/tournaments/:slug/standings
GET /public/tournaments/:slug/bracket
GET /public/tournaments/:slug/awards
```

Public APIs must hide:

* User emails.
* Phone numbers unless explicitly allowed.
* Internal notes.
* Audit logs.
## 15. WebSocket events

Namespace:

```txt
/ws
```

Rooms:

```txt
tournament:{id}
match:{id}
```

Events:

```txt
score.updated
segment.completed
match.completed
standing.updated
bracket.updated
```

