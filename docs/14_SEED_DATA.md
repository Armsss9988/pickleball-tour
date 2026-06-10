# 14 — Seed Data

## 1. Purpose

Seed data giúp developer/AI/tester chạy app nhanh với dữ liệu gần giống giải Golab.

## 2. Organization seed

```json
{
  "id": "org_golab",
  "name": "GOLAB",
  "slug": "golab",
  "status": "active"
}
```

## 3. Users seed

```json
[
  {
    "id": "user_admin",
    "organizationId": "org_golab",
    "email": "admin@golab.local",
    "displayName": "Golab Admin",
    "role": "tournament_admin"
  },
  {
    "id": "user_scorer_1",
    "organizationId": "org_golab",
    "email": "scorer1@golab.local",
    "displayName": "Scorer 1",
    "role": "scorer"
  }
]
```

Password for local dev:

```txt
password123
```

Never use this password in production.

## 4. Tournament seed

```json
{
  "id": "tour_golab_cup_2",
  "organizationId": "org_golab",
  "name": "Giải Pickleball đồng đội Cúp Golab lần 2 - Đường đua tiếp sức đoàn kết",
  "slug": "golab-cup-2",
  "venueName": "Cụm sân Pickleball Hùng Hà",
  "openingTime": "2026-06-14T08:00:00+07:00",
  "registrationDeadline": "2026-06-24T23:59:59+07:00",
  "status": "player_import",
  "publicEnabled": true
}
```

Note: registration deadline is after opening time according to provided document. System should show warning.

## 5. Player seed

Use placeholder names for development.

### 24 male players

```json
[
  { "fullName": "Nam 01", "gender": "male" },
  { "fullName": "Nam 02", "gender": "male" },
  { "fullName": "Nam 03", "gender": "male" },
  { "fullName": "Nam 04", "gender": "male" },
  { "fullName": "Nam 05", "gender": "male" },
  { "fullName": "Nam 06", "gender": "male" },
  { "fullName": "Nam 07", "gender": "male" },
  { "fullName": "Nam 08", "gender": "male" },
  { "fullName": "Nam 09", "gender": "male" },
  { "fullName": "Nam 10", "gender": "male" },
  { "fullName": "Nam 11", "gender": "male" },
  { "fullName": "Nam 12", "gender": "male" },
  { "fullName": "Nam 13", "gender": "male" },
  { "fullName": "Nam 14", "gender": "male" },
  { "fullName": "Nam 15", "gender": "male" },
  { "fullName": "Nam 16", "gender": "male" },
  { "fullName": "Nam 17", "gender": "male" },
  { "fullName": "Nam 18", "gender": "male" },
  { "fullName": "Nam 19", "gender": "male" },
  { "fullName": "Nam 20", "gender": "male" },
  { "fullName": "Nam 21", "gender": "male" },
  { "fullName": "Nam 22", "gender": "male" },
  { "fullName": "Nam 23", "gender": "male" },
  { "fullName": "Nam 24", "gender": "male" }
]
```

### 16 female players

```json
[
  { "fullName": "Nữ 01", "gender": "female" },
  { "fullName": "Nữ 02", "gender": "female" },
  { "fullName": "Nữ 03", "gender": "female" },
  { "fullName": "Nữ 04", "gender": "female" },
  { "fullName": "Nữ 05", "gender": "female" },
  { "fullName": "Nữ 06", "gender": "female" },
  { "fullName": "Nữ 07", "gender": "female" },
  { "fullName": "Nữ 08", "gender": "female" },
  { "fullName": "Nữ 09", "gender": "female" },
  { "fullName": "Nữ 10", "gender": "female" },
  { "fullName": "Nữ 11", "gender": "female" },
  { "fullName": "Nữ 12", "gender": "female" },
  { "fullName": "Nữ 13", "gender": "female" },
  { "fullName": "Nữ 14", "gender": "female" },
  { "fullName": "Nữ 15", "gender": "female" },
  { "fullName": "Nữ 16", "gender": "female" }
]
```

## 6. Team names after draw

Default team names:

```txt
Đội 1
Đội 2
Đội 3
Đội 4
Đội 5
Đội 6
Đội 7
Đội 8
```

Admin can rename later.

## 7. Groups seed after assignment

Default simple assignment:

```txt
Bảng A: Đội 1, Đội 2, Đội 3, Đội 4
Bảng B: Đội 5, Đội 6, Đội 7, Đội 8
```

## 8. Group schedule sample

For Bảng A:

```txt
Round 1: Đội 1 vs Đội 4, Đội 2 vs Đội 3
Round 2: Đội 1 vs Đội 3, Đội 4 vs Đội 2
Round 3: Đội 1 vs Đội 2, Đội 3 vs Đội 4
```

For Bảng B:

```txt
Round 1: Đội 5 vs Đội 8, Đội 6 vs Đội 7
Round 2: Đội 5 vs Đội 7, Đội 8 vs Đội 6
Round 3: Đội 5 vs Đội 6, Đội 7 vs Đội 8
```

## 9. Sample valid lineup

For a team with:

```txt
M1, M2, M3, F1, F2
```

Valid lineup:

```txt
Đôi Nam: M1 + M2
Đôi Nữ: F1 + F2
Đôi Nam Nữ: M3 + F1
```

## 10. Sample match score events

Final score 24-20:

```json
[
  { "eventNo": 1, "scoringTeam": "A", "scoreAAfter": 1, "scoreBAfter": 0 },
  { "eventNo": 2, "scoringTeam": "B", "scoreAAfter": 1, "scoreBAfter": 1 },
  { "eventNo": 13, "scoringTeam": "A", "scoreAAfter": 8, "scoreBAfter": 5 },
  { "eventNo": 28, "scoringTeam": "A", "scoreAAfter": 16, "scoreBAfter": 12 },
  { "eventNo": 44, "scoringTeam": "A", "scoreAAfter": 24, "scoreBAfter": 20 }
]
```

This sample omits intermediate events for brevity. Tests should use complete event sequence.

