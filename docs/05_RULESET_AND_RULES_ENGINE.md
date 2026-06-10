# 05 — Ruleset and Rules Engine

## 1. Why ruleset-driven

Không nên viết logic kiểu:

```ts
const TEAM_COUNT = 8;
const MALE_PER_TEAM = 3;
const WIN_SCORE = 24;
```

Nên lấy từ ruleset để sau này đổi format không phải sửa nhiều nơi.

## 2. Golab ruleset config

```json
{
  "team": {
    "count": 8,
    "size": 5,
    "composition": {
      "male": 3,
      "female": 2
    }
  },
  "players": {
    "requiredTotal": 40,
    "requiredGenderCount": {
      "male": 24,
      "female": 16
    }
  },
  "draft": {
    "type": "random_by_gender",
    "publicSeed": true,
    "allowPreview": true,
    "allowRedrawBeforeConfirm": true,
    "auditEveryDraw": true
  },
  "groups": {
    "count": 2,
    "teamsPerGroup": 4,
    "names": ["Bảng A", "Bảng B"]
  },
  "stage": {
    "groupStage": {
      "format": "single_round_robin",
      "qualifyPerGroup": 3,
      "rankingRules": [
        "MATCH_WINS",
        "POINT_DIFFERENCE",
        "HEAD_TO_HEAD"
      ]
    },
    "knockout": {
      "qualifiedTeams": 6,
      "byeSeeds": ["A1", "B1"],
      "pairings": [
        { "node": "P1", "round": "playoff", "teams": ["A2", "B3"] },
        { "node": "P2", "round": "playoff", "teams": ["B2", "A3"] },
        { "node": "SF1", "round": "semifinal", "teams": ["A1", "W:P2"] },
        { "node": "SF2", "round": "semifinal", "teams": ["B1", "W:P1"] },
        { "node": "F", "round": "final", "teams": ["W:SF1", "W:SF2"] }
      ],
      "thirdPlace": "co_third_for_semifinal_losers"
    }
  },
  "match": {
    "type": "relay",
    "winScore": 24,
    "winBy": 0,
    "inheritScore": true,
    "sideSwitchAfterSegments": [1, 2],
    "contents": [
      {
        "key": "mens_doubles",
        "name": "Đôi Nam",
        "requiredPlayers": { "male": 2, "female": 0 }
      },
      {
        "key": "womens_doubles",
        "name": "Đôi Nữ",
        "requiredPlayers": { "male": 0, "female": 2 }
      },
      {
        "key": "mixed_doubles",
        "name": "Đôi Nam Nữ",
        "requiredPlayers": { "male": 1, "female": 1 }
      }
    ],
    "segmentTargetsByOrder": [8, 16, 24],
    "segmentOrder": {
      "type": "draw_before_match",
      "allowedContentKeys": ["mens_doubles", "womens_doubles", "mixed_doubles"]
    },
    "lineupConstraints": [
      { "type": "TEAM_ALL_MEMBERS_MUST_PLAY" },
      { "type": "MALE_PLAYER_MAX_SEGMENTS", "value": 1 },
      {
        "type": "NO_DUPLICATE_MALE_BETWEEN_CONTENTS",
        "contentKeys": ["mens_doubles", "mixed_doubles"]
      }
    ]
  }
}
```

## 3. Player validation rules

Function:

```ts
validateTournamentPlayers(players, ruleset): ValidationResult
```

Rules:

1. Count total approved registrations.
2. Count gender male/female.
3. Detect missing full name.
4. Detect gender unknown.
5. Warn duplicated normalized name.
Expected result:

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

## 4. Team draw engine

Function:

```ts
drawTeams(input: DrawTeamsInput): DrawTeamsResult
```

Input:

```ts
type DrawTeamsInput = {
  players: Array<{
    id: string;
    fullName: string;
    gender: 'male' | 'female';
  }>;
  teamCount: number;
  composition: { male: number; female: number };
  seed: string;
};
```

Algorithm:

1. Validate total players.
2. Split players by gender.
3. Shuffle male list with deterministic seeded RNG.
4. Shuffle female list with deterministic seeded RNG.
5. Create 8 empty teams.
6. Assign 3 males per team.
7. Assign 2 females per team.
8. Validate each team.
9. Return preview.
Important requirements:

* Same input + same seed = same output.
* Every preview must be saved in `team_draws`.
* Confirmed draw creates `teams` and `team_members`.
## 5. Group assignment rules

For Golab:

* Exactly 2 groups.
* Each group exactly 4 teams.
* Each team assigned once.
Function:

```ts
validateGroupAssignment(groups, teams, ruleset): ValidationResult
```

Errors:

* `GROUP_COUNT_INVALID`
* `GROUP_SIZE_INVALID`
* `TEAM_ASSIGNED_MULTIPLE_GROUPS`
* `TEAM_NOT_ASSIGNED`
## 6. Match segment order draw

Before each match:

* There are 3 content keys:
    * `mens_doubles`
    * `womens_doubles`
    * `mixed_doubles`
* Order is randomized or manually set by admin according to actual bốc thăm.
* Segment target is based on order, not content.
Example:

```json
[
  { "order": 1, "segmentKey": "mixed_doubles", "targetScore": 8 },
  { "order": 2, "segmentKey": "mens_doubles", "targetScore": 16 },
  { "order": 3, "segmentKey": "womens_doubles", "targetScore": 24 }
]
```

## 7. Lineup validation engine

Function:

```ts
validateMatchLineup(input: ValidateMatchLineupInput): ValidateMatchLineupResult
```

Input should contain:

* Team members with gender.
* Segments with content key and required gender counts.
* Lineup players per segment.
* Ruleset constraints.
### 7.1 Segment required players

For each team and each segment:

* Mens doubles: exactly 2 male.
* Womens doubles: exactly 2 female.
* Mixed doubles: exactly 1 male + 1 female.
Errors:

* `SEGMENT_PLAYER_COUNT_INVALID`
* `SEGMENT_GENDER_COMPOSITION_INVALID`
* `PLAYER_NOT_IN_TEAM`
### 7.2 All members must play

Each of 5 team members must appear in at least one segment.

Error:

* `TEAM_MEMBER_NOT_USED`
### 7.3 Male max one segment

Each male player appears in at most one segment.

Error:

* `MALE_PLAYER_MAX_SEGMENTS_EXCEEDED`
### 7.4 No duplicate male between mens doubles and mixed doubles

This is effectively covered by male max one segment, but keep explicit rule for readable error.

Error:

* `DUPLICATE_MALE_BETWEEN_MENS_AND_MIXED`
## 8. Valid Golab lineup example

Team members:

* M1, M2, M3.
* F1, F2.
Lineup:

```txt
Đôi Nam: M1 + M2
Đôi Nữ: F1 + F2
Đôi Nam Nữ: M3 + F1
```

Valid because:

* All 5 players play.
* Each male plays once.
* Female can play more than once.
## 9. Invalid Golab lineup examples

### 9.1 Male duplicated

```txt
Đôi Nam: M1 + M2
Đôi Nữ: F1 + F2
Đôi Nam Nữ: M1 + F1
```

Invalid:

* M1 plays twice.
### 9.2 Missing team member

```txt
Đôi Nam: M1 + M2
Đôi Nữ: F1 + F2
Đôi Nam Nữ: M2 + F1
```

Invalid:

* M3 never plays.
* M2 plays twice.
### 9.3 Wrong gender composition

```txt
Đôi Nam: M1 + F1
```

Invalid:

* Mens doubles requires 2 male.
## 10. Ranking rules

Function:

```ts
calculateStandings(matches, groupTeams, rankingRules): Standing[]
```

Rules in order:

1. More wins.
2. Higher point difference.
3. Head-to-head winner.
If tie remains:

* Set `tie_break_detail.requires_admin_decision = true`.
* Do not silently invent rank if rule is insufficient.
## 11. Rule implementation guideline

Each rule should be small and testable:

```ts
interface Rule<TInput> {
  code: string;
  validate(input: TInput): RuleViolation[];
}
```

Violation format:

```ts
type RuleViolation = {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  path?: string;
  metadata?: Record<string, unknown>;
};
```

## 12. AI implementation instruction

When AI implements rules:

1. Start with pure functions in `packages/domain`.
2. Write unit tests before wiring API.
3. Use explicit error codes.
4. Never hide validation failure.
5. Never auto-correct lineup without user confirmation.
