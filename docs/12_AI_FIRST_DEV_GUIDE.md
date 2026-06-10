# 12 — AI-first Development Guide

## 1. Goal

Thiết kế repo và tài liệu để AI coding agent có thể đọc, hiểu, implement và sửa lỗi với ít hallucination nhất.

## 2. Principles

1. Domain logic must be pure and testable.
2. Controllers should be thin.
3. Services orchestrate DB + domain + audit.
4. Rules should have explicit error codes.
5. Every feature should have fixtures and tests.
6. Docs should stay close to code.
7. Do not hide business rules inside UI.
## 3. Recommended repo structure

```txt
golab-tournament-platform/
  apps/
    api/
      src/
        modules/
          auth/
          organizations/
          tournaments/
          players/
          teams/
          groups/
          schedule/
          matches/
          lineups/
          scoring/
          rankings/
          brackets/
          audit/
        main.ts
    web/
      app/
      components/
      features/
      lib/
  packages/
    domain/
      src/
        player-validation/
        team-draw/
        group-assignment/
        schedule/
        lineup-validation/
        scoring/
        ranking/
        bracket/
    contracts/
      src/
        dto/
        schemas/
        errors.ts
    db/
      prisma/ or drizzle/
      seeds/
  docs/
```

## 4. AI task style

When asking AI to implement, use small tasks.

Good:

```txt
Implement packages/domain/lineup-validation with tests for Golab rules.
Use docs/05_RULESET_AND_RULES_ENGINE.md as source of truth.
Do not touch API yet.
```

Bad:

```txt
Build the whole app.
```

## 5. Domain function templates

### Validation result

```ts
export type Severity = 'error' | 'warning';

export type RuleViolation = {
  code: string;
  message: string;
  severity: Severity;
  path?: string;
  metadata?: Record<string, unknown>;
};

export type ValidationResult = {
  valid: boolean;
  errors: RuleViolation[];
  warnings: RuleViolation[];
};
```

### Team draw

```ts
export type DrawTeamsInput = {
  players: Array<{
    id: string;
    fullName: string;
    gender: 'male' | 'female';
  }>;
  teamCount: number;
  composition: {
    male: number;
    female: number;
  };
  seed: string;
};

export type DrawTeamsResult = {
  seed: string;
  algorithmVersion: string;
  teams: Array<{
    tempTeamNo: number;
    players: Array<{
      id: string;
      fullName: string;
      gender: 'male' | 'female';
    }>;
  }>;
};
```

### Scoring

```ts
export type MatchScoreState = {
  matchId: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  activeSegment: {
    id: string;
    order: number;
    targetScore: number;
  };
  winScore: number;
};
```

## 6. Testing strategy for AI

Write tests in this order:

1. Player validation.
2. Team draw.
3. Group assignment.
4. Schedule generation.
5. Lineup validation.
6. Scoring engine.
7. Ranking.
8. Bracket.
Each domain module should be testable without DB.

## 7. Fixtures

Keep fixtures in:

```txt
packages/domain/test-fixtures/golab/
```

Fixtures:

```txt
players-40-valid.json
players-invalid-count.json
team-draw-valid.json
lineup-valid.json
lineup-invalid-male-duplicate.json
score-events-sample.json
standings-sample.json
```

## 8. API implementation pattern

Controller:

```ts
@Post(':tournamentId/team-draws/preview')
previewDraw(@Param('tournamentId') id: string, @CurrentUser() user: User) {
  return this.teamDrawService.preview(id, user.id);
}
```

Service:

```ts
async preview(tournamentId: string, userId: string) {
  const tournament = await this.repo.getTournament(tournamentId);
  const players = await this.repo.getApprovedPlayers(tournamentId);
  const ruleset = await this.rulesetRepo.get(tournament.rulesetId);

  const result = drawTeams({ players, ...ruleset.team, seed: createSeed() });

  await this.repo.saveDrawPreview(result);
  await this.audit.log(...);

  return result;
}
```

Domain:

```ts
export function drawTeams(input: DrawTeamsInput): DrawTeamsResult {
  // no DB, no HTTP, no framework
}
```

## 9. AI-readable comments

Use comments to explain why, not what.

Good:

```ts
// Female players are allowed to appear in multiple segments because Golab rules only restrict male players.
```

Bad:

```ts
// Loop through players.
```

## 10. ADRs

Create Architecture Decision Records:

```txt
docs/adr/0001-use-modular-monolith.md
docs/adr/0002-use-event-log-for-scoring.md
docs/adr/0003-player-profile-without-user-account.md
docs/adr/0004-ruleset-driven-golab-format.md
```

## 11. Implementation order for AI agent

Recommended sequence:

1. Create monorepo skeleton.
2. Implement DB schema.
3. Seed Golab tournament/ruleset.
4. Implement domain functions + tests.
5. Implement API modules.
6. Implement Admin UI screens.
7. Implement Scorer UI.
8. Implement Public page.
9. Add realtime.
10. Polish and acceptance tests.
## 12. Guardrails for AI

AI must not:

* Remove audit logs.
* Store scoring only as final score.
* Require player accounts in MVP.
* Hard-code Golab rules in UI only.
* Allow match start without valid lineup.
* Allow scoring after result confirmed.
* Expose private data on public page.
## 13. Prompt template for implementation

```txt
You are implementing Golab Tournament Management Platform.
Read docs/01_PRD.md, docs/05_RULESET_AND_RULES_ENGINE.md, and docs/07_SCORING_ENGINE.md first.
Implement only [MODULE_NAME].
Use TypeScript.
Domain logic must be pure and covered by unit tests.
Do not change unrelated modules.
Return a summary of files changed and tests added.
```

