# Role-Aware Dependency Locking UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one role-aware tournament app that shows each user only relevant work, locks only actions with missing required data, and uses non-technical Vietnamese guidance instead of raw workflow/status enums.

**Architecture:** Replace linear phase locking with a pure web policy module that computes role visibility, dependency-based action access, next recommended actions, public readiness, and human labels. Wire that policy into auth helpers, admin layout/sidebar, command center dashboard, action pages, and backend mutation guards; replace guest auto-login with a read-only public endpoint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, NestJS 11, Prisma, Jest for API tests, Vitest for pure web policy tests, existing `apiFetch`, `useActiveTournament`, toast, sidebar, and dashboard components.

---

## Supersedes

This plan supersedes `docs/superpowers/plans/2026-05-28-workflow-locking.md`. Do not implement the old plan's broad `phase > unlockLevel` locking. Keep its useful security goal: direct URLs and quick actions must not bypass hard dependencies.

## File Structure

- Modify `apps/web/package.json`: add a `test` script and `vitest` dev dependency so the pure policy can be tested.
- Create `apps/web/src/lib/current-user.ts`: reads the stored login user and resolves the app role.
- Create `apps/web/src/lib/tournament-ux-policy.ts`: pure role/dependency policy with no React or browser dependencies.
- Create `apps/web/src/lib/tournament-ux-policy.test.ts`: tests role visibility, hard locks, soft guidance, and publish readiness.
- Create `apps/web/src/components/action-gate.tsx`: shared enabled/disabled action surface with human lock reasons.
- Modify `apps/web/src/components/sidebar.tsx`: filter visible areas by role and show dependency reasons for hard-locked actions.
- Modify `apps/web/src/app/admin/[tournamentId]/layout.tsx`: enforce role visibility and hard dependency route guards.
- Modify `apps/web/src/app/admin/[tournamentId]/page.tsx`: replace generic dashboard quick actions with role-aware command center.
- Modify admin action pages: draw, groups, lineup, scoring, ruleset, tournament/publish areas to consume the same policy.
- Create `apps/api/src/modules/public/public.controller.ts`, `public.service.ts`, and `public.module.ts`: read-only guest endpoint.
- Modify `apps/api/src/app.module.ts`: register `PublicModule`.
- Modify `apps/web/src/app/t/[slug]/page.tsx`: remove scorer auto-login and use the public endpoint.
- Modify backend mutation services listed in Task 9: team draw, group assignment, schedule generation message, and tournament publish.
- Add focused API tests for dependency guards and public endpoint behavior.

---

### Task 1: Add Web Policy Test Harness

**Files:**
- Modify: `apps/web/package.json`
- Verify: `pnpm --filter @golab/web test`

- [ ] **Step 1: Add the web test script and Vitest dependency**

Modify `apps/web/package.json`:

```json
{
  "name": "@golab/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
  "dependencies": {
    "@golab/contracts": "workspace:*",
    "@golab/domain": "workspace:*",
    "lucide-react": "^1.17.0",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "socket.io-client": "^4.8.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Refresh lockfile if pnpm requires it**

Run: `pnpm install --lockfile-only`

Expected: exits `0`. If `pnpm-lock.yaml` changes, include it in the commit. If it does not change because Vitest is already in the workspace lockfile, commit only `apps/web/package.json`.

- [ ] **Step 3: Run the empty web test target**

Run: `pnpm --filter @golab/web test`

Expected: Vitest exits successfully with no tests or reports no test files. If Vitest exits non-zero because there are no tests, continue after Task 2 adds tests.

- [ ] **Step 4: Commit the test harness**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "test(web): add vitest harness"
```

---

### Task 2: Add Pure Role And Dependency Policy

**Files:**
- Create: `apps/web/src/lib/tournament-ux-policy.test.ts`
- Create: `apps/web/src/lib/tournament-ux-policy.ts`
- Verify: `pnpm --filter @golab/web test -- tournament-ux-policy.test.ts`

- [ ] **Step 1: Write failing policy tests**

Create `apps/web/src/lib/tournament-ux-policy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getActionAccess,
  getHumanStatusLabel,
  getNextRecommendedAction,
  getPublishReadiness,
  getVisibleAreasForRole,
  type TournamentUxContext,
} from './tournament-ux-policy';

const baseContext: TournamentUxContext = {
  tournamentId: 't1',
  tournamentSlug: 'cup-golab',
  status: 'DRAFT',
  publicEnabled: false,
  hasTournamentInfo: false,
  hasValidRuleset: false,
  hasDependentSetupData: false,
  playerTotal: 0,
  maleCount: 0,
  femaleCount: 0,
  requiredPlayers: null,
  requiredMales: null,
  requiredFemales: null,
  teamCount: 0,
  groupsAssigned: false,
  scheduleConfigReady: false,
  matchCount: 0,
  lineupReadyCount: 0,
  scoringReadyCount: 0,
  completedMatchCount: 0,
  resultConfirmedMatchCount: 0,
  hasKnockoutStage: false,
  currentUserOwnsTeam: false,
};

describe('tournament UX policy', () => {
  it('shows only public areas to guests', () => {
    expect(getVisibleAreasForRole('guest', baseContext)).toEqual(['public']);
  });

  it('shows setup areas to BTC admin', () => {
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('players');
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('schedule');
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('publish');
  });

  it('shows only scoring work to scorer', () => {
    expect(getVisibleAreasForRole('scorer', baseContext)).toEqual(['scoring']);
  });

  it('shows only team work to captain', () => {
    expect(getVisibleAreasForRole('captain', baseContext)).toEqual(['lineup', 'team-schedule', 'team-results']);
  });

  it('keeps schedule setup open early but locks match generation until groups exist', () => {
    expect(getActionAccess('configureSchedule', 'btc_admin', baseContext).allowed).toBe(true);
    const access = getActionAccess('generateMatches', 'btc_admin', baseContext);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('chưa phân bảng');
    expect(access.nextHref).toBe('/admin/t1/groups');
  });

  it('locks team draw until ruleset and player composition are valid', () => {
    const access = getActionAccess('drawTeams', 'btc_admin', {
      ...baseContext,
      hasValidRuleset: true,
      requiredPlayers: 40,
      requiredMales: 24,
      requiredFemales: 16,
      playerTotal: 39,
      maleCount: 24,
      femaleCount: 15,
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('Cần 40 VĐV');
  });

  it('allows team draw when ruleset and player composition are valid', () => {
    expect(getActionAccess('drawTeams', 'btc_admin', {
      ...baseContext,
      hasValidRuleset: true,
      requiredPlayers: 40,
      requiredMales: 24,
      requiredFemales: 16,
      playerTotal: 40,
      maleCount: 24,
      femaleCount: 16,
    }).allowed).toBe(true);
  });

  it('locks ruleset editing after dependent setup data exists', () => {
    const access = getActionAccess('editRuleset', 'btc_admin', {
      ...baseContext,
      hasDependentSetupData: true,
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('đã có dữ liệu phụ thuộc');
  });

  it('requires tournament completion before publishing', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      teamCount: 8,
      matchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'COMPLETED',
    });
    expect(readiness.ready).toBe(true);
  });

  it('maps technical status to human labels', () => {
    expect(getHumanStatusLabel('TEAM_DRAW_COMPLETED')).toBe('Đã có đội');
  });

  it('returns the next action from missing dependencies', () => {
    const next = getNextRecommendedAction('btc_admin', baseContext);
    expect(next.key).toBe('editTournament');
    expect(next.label).toContain('Bổ sung thông tin giải');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @golab/web test -- tournament-ux-policy.test.ts`

Expected: FAIL because `./tournament-ux-policy` does not exist.

- [ ] **Step 3: Implement the policy module**

Create `apps/web/src/lib/tournament-ux-policy.ts`:

```ts
export type AppRole = 'guest' | 'btc_admin' | 'scorer' | 'captain' | 'super_admin';

export type TournamentStatus =
  | 'DRAFT'
  | 'PLAYER_IMPORT'
  | 'PLAYERS_READY'
  | 'TEAM_DRAW_COMPLETED'
  | 'GROUP_ASSIGNED'
  | 'SCHEDULE_GENERATED'
  | 'RUNNING'
  | 'GROUP_COMPLETED'
  | 'KNOCKOUT_GENERATED'
  | 'KNOCKOUT_RUNNING'
  | 'COMPLETED'
  | 'PUBLISHED';

export type AreaKey =
  | 'public'
  | 'dashboard'
  | 'tournament'
  | 'ruleset'
  | 'players'
  | 'draw'
  | 'teams'
  | 'groups'
  | 'schedule'
  | 'matches'
  | 'lineup'
  | 'team-schedule'
  | 'team-results'
  | 'scoring'
  | 'standings'
  | 'bracket'
  | 'awards'
  | 'publish'
  | 'audit';

export type ActionKey =
  | 'editTournament'
  | 'editRuleset'
  | 'addPlayers'
  | 'validatePlayers'
  | 'drawTeams'
  | 'assignGroups'
  | 'configureSchedule'
  | 'generateMatches'
  | 'submitLineup'
  | 'scoreMatch'
  | 'confirmResults'
  | 'publishTournament';

export interface TournamentUxContext {
  tournamentId: string;
  tournamentSlug: string | null;
  status: TournamentStatus | string;
  publicEnabled: boolean;
  hasTournamentInfo: boolean;
  hasValidRuleset: boolean;
  hasDependentSetupData: boolean;
  playerTotal: number;
  maleCount: number;
  femaleCount: number;
  requiredPlayers: number | null;
  requiredMales: number | null;
  requiredFemales: number | null;
  teamCount: number;
  groupsAssigned: boolean;
  scheduleConfigReady: boolean;
  matchCount: number;
  lineupReadyCount: number;
  scoringReadyCount: number;
  completedMatchCount: number;
  resultConfirmedMatchCount: number;
  hasKnockoutStage: boolean;
  currentUserOwnsTeam: boolean;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  required?: string;
  nextLabel?: string;
  nextHref?: string;
}

export interface RecommendedAction {
  key: ActionKey;
  label: string;
  description: string;
  href: string;
}

export interface PublishReadiness {
  ready: boolean;
  missing: string[];
}

const adminAreas: AreaKey[] = [
  'dashboard',
  'tournament',
  'ruleset',
  'players',
  'draw',
  'teams',
  'groups',
  'schedule',
  'matches',
  'lineup',
  'scoring',
  'standings',
  'bracket',
  'awards',
  'publish',
  'audit',
];

const statusLabels: Record<string, string> = {
  DRAFT: 'Đang chuẩn bị giải',
  PLAYER_IMPORT: 'Đang nhập vận động viên',
  PLAYERS_READY: 'Đủ vận động viên, có thể bốc thăm',
  TEAM_DRAW_COMPLETED: 'Đã có đội',
  GROUP_ASSIGNED: 'Đã phân bảng',
  SCHEDULE_GENERATED: 'Đã có lịch thi đấu',
  RUNNING: 'Đang thi đấu',
  GROUP_COMPLETED: 'Đã xong vòng bảng',
  KNOCKOUT_GENERATED: 'Đã có bracket',
  KNOCKOUT_RUNNING: 'Đang thi đấu knockout',
  COMPLETED: 'Đã hoàn tất',
  PUBLISHED: 'Đã công khai',
};

export function getPrimaryRole(roles?: string[] | null): AppRole {
  if (!roles || roles.length === 0) return 'guest';
  if (roles.includes('SUPER_ADMIN') || roles.includes('platform_owner')) return 'super_admin';
  if (roles.includes('organization_admin') || roles.includes('tournament_admin')) return 'btc_admin';
  if (roles.includes('SCORER')) return 'scorer';
  if (roles.includes('CAPTAIN')) return 'captain';
  return 'guest';
}

export function getHumanStatusLabel(status?: string | null): string {
  if (!status) return 'Chưa rõ trạng thái';
  return statusLabels[status] ?? 'Chưa rõ trạng thái';
}

export function getVisibleAreasForRole(role: AppRole, context: TournamentUxContext): AreaKey[] {
  if (role === 'guest') return ['public'];
  if (role === 'scorer') return ['scoring'];
  if (role === 'captain') return ['lineup', 'team-schedule', 'team-results'];
  if (role === 'super_admin') return adminAreas;
  return adminAreas.filter((area) => area !== 'awards' || context.status === 'COMPLETED' || context.status === 'PUBLISHED');
}

function forbidden(role: AppRole): AccessResult {
  return {
    allowed: false,
    reason: role === 'guest'
      ? 'Khách chỉ được xem thông tin công khai của giải.'
      : 'Bạn không có quyền thực hiện thao tác này.',
  };
}

function requiresAdmin(role: AppRole): AccessResult | null {
  return role === 'btc_admin' || role === 'super_admin' ? null : forbidden(role);
}

function hasValidPlayerComposition(context: TournamentUxContext): boolean {
  if (!context.hasValidRuleset) return false;
  if (context.requiredPlayers === null || context.requiredMales === null || context.requiredFemales === null) return false;
  return context.playerTotal === context.requiredPlayers
    && context.maleCount === context.requiredMales
    && context.femaleCount === context.requiredFemales;
}

function playerRequirementText(context: TournamentUxContext): string {
  if (context.requiredPlayers === null || context.requiredMales === null || context.requiredFemales === null) {
    return 'Cần cấu hình ruleset hợp lệ để biết số lượng vận động viên cần nhập.';
  }
  return `Cần ${context.requiredPlayers} VĐV: ${context.requiredMales} nam, ${context.requiredFemales} nữ. Hiện có ${context.playerTotal} VĐV: ${context.maleCount} nam, ${context.femaleCount} nữ.`;
}

export function getActionAccess(action: ActionKey, role: AppRole, context: TournamentUxContext): AccessResult {
  switch (action) {
    case 'editTournament': {
      const denied = requiresAdmin(role);
      return denied ?? { allowed: true };
    }
    case 'editRuleset': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      if (context.hasDependentSetupData) {
        return {
          allowed: false,
          reason: 'Ruleset đang khóa vì đã có dữ liệu phụ thuộc như vận động viên, đội, lịch hoặc điểm số.',
          required: 'Muốn sửa ruleset, hãy dùng luồng rollback có kiểm soát.',
          nextLabel: 'Xem hướng dẫn rollback',
          nextHref: `/admin/${context.tournamentId}/ruleset`,
        };
      }
      return { allowed: true };
    }
    case 'addPlayers': {
      const denied = requiresAdmin(role);
      return denied ?? { allowed: true };
    }
    case 'validatePlayers': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      if (!context.hasValidRuleset) {
        return {
          allowed: false,
          reason: 'Chưa thể kiểm tra vận động viên vì ruleset chưa hợp lệ.',
          required: 'Hãy cấu hình ruleset trước.',
          nextLabel: 'Mở cấu hình ruleset',
          nextHref: `/admin/${context.tournamentId}/ruleset`,
        };
      }
      return { allowed: true };
    }
    case 'drawTeams': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      if (!hasValidPlayerComposition(context)) {
        return {
          allowed: false,
          reason: `Bốc thăm đang khóa vì chưa đủ vận động viên. ${playerRequirementText(context)}`,
          required: 'Nhập đủ vận động viên theo ruleset.',
          nextLabel: 'Mở trang vận động viên',
          nextHref: `/admin/${context.tournamentId}/players`,
        };
      }
      return { allowed: true };
    }
    case 'assignGroups': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      if (context.teamCount < 8) {
        return {
          allowed: false,
          reason: `Phân bảng đang khóa vì chưa đủ đội. Hiện có ${context.teamCount}/8 đội.`,
          required: 'Hãy xác nhận bốc thăm đội trước.',
          nextLabel: 'Mở bốc thăm',
          nextHref: `/admin/${context.tournamentId}/draw`,
        };
      }
      return { allowed: true };
    }
    case 'configureSchedule': {
      const denied = requiresAdmin(role);
      return denied ?? { allowed: true };
    }
    case 'generateMatches': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      if (!context.groupsAssigned) {
        return {
          allowed: false,
          reason: 'Sinh lịch thi đấu đang khóa vì chưa phân bảng.',
          required: 'Hãy phân 8 đội vào bảng trước.',
          nextLabel: 'Mở phân bảng',
          nextHref: `/admin/${context.tournamentId}/groups`,
        };
      }
      return { allowed: true };
    }
    case 'submitLineup': {
      if (role !== 'captain' && role !== 'btc_admin' && role !== 'super_admin') return forbidden(role);
      if (role === 'captain' && !context.currentUserOwnsTeam) return forbidden(role);
      if (context.matchCount === 0) {
        return {
          allowed: false,
          reason: 'Chưa có trận đấu để khai báo lineup.',
          required: 'BTC cần sinh lịch thi đấu trước.',
          nextLabel: 'Xem lịch đội',
          nextHref: `/admin/${context.tournamentId}/lineup`,
        };
      }
      return { allowed: true };
    }
    case 'scoreMatch': {
      if (role !== 'scorer' && role !== 'btc_admin' && role !== 'super_admin') return forbidden(role);
      if (context.scoringReadyCount === 0) {
        return {
          allowed: false,
          reason: 'Chấm điểm đang khóa vì chưa có trận nào sẵn sàng.',
          required: 'Cần có lịch thi đấu và lineup đã khóa.',
          nextLabel: 'Xem trận đấu',
          nextHref: `/admin/${context.tournamentId}/scoring`,
        };
      }
      return { allowed: true };
    }
    case 'confirmResults': {
      if (role !== 'scorer' && role !== 'btc_admin' && role !== 'super_admin') return forbidden(role);
      if (context.completedMatchCount === 0) {
        return {
          allowed: false,
          reason: 'Chưa có trận đã hoàn thành để xác nhận kết quả.',
          nextLabel: 'Xem trận đấu',
          nextHref: `/admin/${context.tournamentId}/scoring`,
        };
      }
      return { allowed: true };
    }
    case 'publishTournament': {
      const denied = requiresAdmin(role);
      if (denied) return denied;
      const readiness = getPublishReadiness(context);
      if (!readiness.ready) {
        return {
          allowed: false,
          reason: `Chưa thể công khai giải vì còn thiếu: ${readiness.missing.join(', ')}.`,
          required: 'Hoàn tất các mục còn thiếu trước khi công khai.',
          nextLabel: 'Xem checklist công khai',
          nextHref: `/admin/${context.tournamentId}`,
        };
      }
      return { allowed: true };
    }
  }
}

export function getPublishReadiness(context: TournamentUxContext): PublishReadiness {
  const missing: string[] = [];
  if (!context.hasTournamentInfo) missing.push('thông tin giải');
  if (!context.hasValidRuleset) missing.push('ruleset');
  if (context.teamCount < 8) missing.push('đội thi đấu');
  if (context.matchCount === 0) missing.push('lịch thi đấu');
  if (context.resultConfirmedMatchCount < context.matchCount) missing.push('kết quả trận đấu');
  if (context.hasKnockoutStage && context.status !== 'COMPLETED' && context.status !== 'PUBLISHED') missing.push('vòng knockout hoàn tất');
  if (context.status !== 'COMPLETED' && context.status !== 'PUBLISHED') missing.push('trạng thái hoàn tất');
  return { ready: missing.length === 0, missing };
}

export function getNextRecommendedAction(role: AppRole, context: TournamentUxContext): RecommendedAction {
  if (role === 'guest') {
    return {
      key: 'publishTournament',
      label: 'Xem thông tin giải',
      description: 'Bạn đang ở chế độ xem công khai.',
      href: context.tournamentSlug ? `/t/${context.tournamentSlug}` : '/',
    };
  }

  if (role === 'scorer') {
    return {
      key: 'scoreMatch',
      label: context.scoringReadyCount > 0 ? 'Mở bàn trọng tài' : 'Chưa có trận sẵn sàng chấm điểm',
      description: context.scoringReadyCount > 0
        ? `${context.scoringReadyCount} trận có thể xử lý.`
        : 'BTC cần tạo lịch và khóa lineup trước.',
      href: `/admin/${context.tournamentId}/scoring`,
    };
  }

  if (role === 'captain') {
    return {
      key: 'submitLineup',
      label: context.matchCount > 0 ? 'Xem lineup đội của tôi' : 'Chưa có trận cần khai báo lineup',
      description: context.matchCount > 0
        ? 'Kiểm tra các trận cần nhập hoặc đã khóa lineup.'
        : 'BTC cần tạo lịch thi đấu trước.',
      href: `/admin/${context.tournamentId}/lineup`,
    };
  }

  if (!context.hasTournamentInfo) {
    return {
      key: 'editTournament',
      label: 'Bổ sung thông tin giải',
      description: 'Nhập địa điểm, thời gian khai mạc và hạn đăng ký để người xem hiểu giải đấu.',
      href: `/admin/${context.tournamentId}/tournament`,
    };
  }
  if (!context.hasValidRuleset) {
    return {
      key: 'editRuleset',
      label: 'Cấu hình ruleset',
      description: 'Ruleset giúp hệ thống biết cần bao nhiêu VĐV và bốc thăm như thế nào.',
      href: `/admin/${context.tournamentId}/ruleset`,
    };
  }
  if (!hasValidPlayerComposition(context)) {
    return {
      key: 'addPlayers',
      label: 'Nhập đủ vận động viên',
      description: playerRequirementText(context),
      href: `/admin/${context.tournamentId}/players`,
    };
  }
  if (context.teamCount < 8) {
    return {
      key: 'drawTeams',
      label: 'Bốc thăm đội',
      description: 'Đã đủ vận động viên, có thể bốc thăm chia đội.',
      href: `/admin/${context.tournamentId}/draw`,
    };
  }
  if (!context.groupsAssigned) {
    return {
      key: 'assignGroups',
      label: 'Phân bảng',
      description: 'Đã có đội, hãy phân đội vào bảng trước khi sinh lịch.',
      href: `/admin/${context.tournamentId}/groups`,
    };
  }
  if (context.matchCount === 0) {
    return {
      key: 'generateMatches',
      label: 'Sinh lịch thi đấu',
      description: 'Đã phân bảng, có thể sinh lịch trận đấu.',
      href: `/admin/${context.tournamentId}/groups`,
    };
  }
  return {
    key: 'publishTournament',
    label: getPublishReadiness(context).ready ? 'Công khai giải' : 'Theo dõi hoàn tất giải',
    description: getPublishReadiness(context).ready
      ? 'Giải đã đủ điều kiện công khai.'
      : 'Giải chỉ được công khai sau khi hoàn tất.',
    href: `/admin/${context.tournamentId}`,
  };
}
```

- [ ] **Step 4: Run focused policy tests**

Run: `pnpm --filter @golab/web test -- tournament-ux-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit policy and tests**

```bash
git add apps/web/src/lib/tournament-ux-policy.ts apps/web/src/lib/tournament-ux-policy.test.ts
git commit -m "feat(web): add role-aware dependency policy"
```

---

### Task 3: Add Current User And Tournament Context Builders

**Files:**
- Create: `apps/web/src/lib/current-user.ts`
- Create: `apps/web/src/lib/tournament-ux-context.ts`
- Verify: `pnpm --filter @golab/web lint`

- [ ] **Step 1: Add current user helper**

Create `apps/web/src/lib/current-user.ts`:

```ts
import { getPrimaryRole, type AppRole } from './tournament-ux-policy';

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface CurrentUserState {
  user: StoredUser | null;
  role: AppRole;
  authenticated: boolean;
}

export function getCurrentUser(): CurrentUserState {
  if (typeof window === 'undefined') {
    return { user: null, role: 'guest', authenticated: false };
  }

  const raw = window.localStorage.getItem('golab_user');
  if (!raw) return { user: null, role: 'guest', authenticated: false };

  try {
    const user = JSON.parse(raw) as StoredUser;
    return {
      user,
      role: getPrimaryRole(user.roles),
      authenticated: true,
    };
  } catch {
    window.localStorage.removeItem('golab_user');
    return { user: null, role: 'guest', authenticated: false };
  }
}
```

- [ ] **Step 2: Add tournament context builder**

Create `apps/web/src/lib/tournament-ux-context.ts`:

```ts
import type { TournamentUxContext } from './tournament-ux-policy';

interface BuildContextInput {
  tournament: any;
  stats?: {
    playersCount?: number;
    malesCount?: number;
    femalesCount?: number;
    teamsCount?: number;
    matchesCount?: number;
    completedMatches?: number;
    resultConfirmedMatches?: number;
    lineupReadyCount?: number;
    scoringReadyCount?: number;
  };
  currentUserOwnsTeam?: boolean;
}

function hasTournamentInfo(tournament: any): boolean {
  return Boolean(tournament?.name && tournament?.slug && tournament?.venueName && tournament?.openingTime);
}

function getRequiredCounts(tournament: any) {
  const composition = tournament?.ruleset?.teamCompositionRule ?? tournament?.ruleset?.teamComposition;
  if (!composition) {
    return { requiredPlayers: null, requiredMales: null, requiredFemales: null };
  }
  const teamCount = 8;
  return {
    requiredPlayers: teamCount * Number(composition.teamSize ?? 0),
    requiredMales: teamCount * Number(composition.maleCount ?? 0),
    requiredFemales: teamCount * Number(composition.femaleCount ?? 0),
  };
}

export function buildTournamentUxContext(input: BuildContextInput): TournamentUxContext {
  const tournament = input.tournament;
  const stats = input.stats ?? {};
  const required = getRequiredCounts(tournament);
  const playerTotal = stats.playersCount ?? 0;
  const teamCount = stats.teamsCount ?? 0;
  const matchCount = stats.matchesCount ?? 0;
  const hasValidRuleset = Boolean(
    tournament?.ruleset
      && (tournament.ruleset.teamCompositionRule || tournament.ruleset.teamComposition)
      && (tournament.ruleset.scoringConfig)
  );

  return {
    tournamentId: tournament?.id ?? '',
    tournamentSlug: tournament?.slug ?? null,
    status: tournament?.status ?? 'DRAFT',
    publicEnabled: Boolean(tournament?.publicEnabled),
    hasTournamentInfo: hasTournamentInfo(tournament),
    hasValidRuleset,
    hasDependentSetupData: playerTotal > 0 || teamCount > 0 || matchCount > 0,
    playerTotal,
    maleCount: stats.malesCount ?? 0,
    femaleCount: stats.femalesCount ?? 0,
    requiredPlayers: required.requiredPlayers,
    requiredMales: required.requiredMales,
    requiredFemales: required.requiredFemales,
    teamCount,
    groupsAssigned: tournament?.status === 'GROUP_ASSIGNED'
      || tournament?.status === 'SCHEDULE_GENERATED'
      || tournament?.status === 'RUNNING'
      || tournament?.status === 'GROUP_COMPLETED'
      || tournament?.status === 'KNOCKOUT_GENERATED'
      || tournament?.status === 'KNOCKOUT_RUNNING'
      || tournament?.status === 'COMPLETED'
      || tournament?.status === 'PUBLISHED',
    scheduleConfigReady: Boolean(tournament?.openingTime),
    matchCount,
    lineupReadyCount: stats.lineupReadyCount ?? 0,
    scoringReadyCount: stats.scoringReadyCount ?? 0,
    completedMatchCount: stats.completedMatches ?? 0,
    resultConfirmedMatchCount: stats.resultConfirmedMatches ?? 0,
    hasKnockoutStage: tournament?.status === 'KNOCKOUT_GENERATED'
      || tournament?.status === 'KNOCKOUT_RUNNING'
      || tournament?.status === 'COMPLETED'
      || tournament?.status === 'PUBLISHED',
    currentUserOwnsTeam: Boolean(input.currentUserOwnsTeam),
  };
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors from the helper files.

- [ ] **Step 4: Commit helpers**

```bash
git add apps/web/src/lib/current-user.ts apps/web/src/lib/tournament-ux-context.ts
git commit -m "feat(web): add role and tournament context helpers"
```

---

### Task 4: Add Shared Action Gate Component

**Files:**
- Create: `apps/web/src/components/action-gate.tsx`
- Verify: `pnpm --filter @golab/web lint`

- [ ] **Step 1: Create reusable action gate component**

Create `apps/web/src/components/action-gate.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from './icons';
import type { AccessResult } from '@/lib/tournament-ux-policy';

interface ActionGateProps {
  access: AccessResult;
  href: string;
  label: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function ActionGate({ access, href, label, description, className = '', children }: ActionGateProps) {
  if (!access.allowed) {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left opacity-80 ${className}`}
        title={access.reason}
      >
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-300">{label}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500">{access.reason || description}</div>
          {access.nextHref && access.nextLabel && (
            <Link href={access.nextHref} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300">
              {access.nextLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 text-left transition-all hover:border-amber-500/30 hover:bg-slate-800/80 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-200">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      {children ?? <ArrowRight className="h-4 w-4 text-slate-600" />}
    </Link>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors.

- [ ] **Step 3: Commit action gate**

```bash
git add apps/web/src/components/action-gate.tsx
git commit -m "feat(web): add dependency-aware action gate"
```

---

### Task 5: Make Sidebar And Admin Layout Role-Aware

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`
- Modify: `apps/web/src/app/admin/[tournamentId]/layout.tsx`
- Verify: `pnpm --filter @golab/web lint`

- [ ] **Step 1: Filter sidebar by role**

In `apps/web/src/components/sidebar.tsx`, import:

```ts
import { getCurrentUser } from '@/lib/current-user';
import { getVisibleAreasForRole, type AreaKey } from '@/lib/tournament-ux-policy';
```

Add `key: AreaKey` to each local nav item. Then inside `SidebarContent`, derive visible areas:

```tsx
const { role } = getCurrentUser();
const visibleAreas = new Set(getVisibleAreasForRole(role, {
  tournamentId: tournamentId ?? '',
  tournamentSlug: null,
  status: tournamentStatus ?? 'DRAFT',
  publicEnabled: false,
  hasTournamentInfo: true,
  hasValidRuleset: true,
  hasDependentSetupData: false,
  playerTotal: 0,
  maleCount: 0,
  femaleCount: 0,
  requiredPlayers: null,
  requiredMales: null,
  requiredFemales: null,
  teamCount: 0,
  groupsAssigned: false,
  scheduleConfigReady: false,
  matchCount: 0,
  lineupReadyCount: 0,
  scoringReadyCount: 0,
  completedMatchCount: 0,
  resultConfirmedMatchCount: 0,
  hasKnockoutStage: false,
  currentUserOwnsTeam: false,
}));
```

Filter nav items:

```tsx
{group.items.filter((item) => visibleAreas.has(item.key)).map(item => {
  // existing render
})}
```

- [ ] **Step 2: Redirect guests and role-forbidden users in layout**

In `apps/web/src/app/admin/[tournamentId]/layout.tsx`, import:

```ts
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/current-user';
import { getVisibleAreasForRole, type AreaKey } from '@/lib/tournament-ux-policy';
```

Add a helper in the file:

```ts
function areaFromPath(pathname: string): AreaKey {
  if (pathname.endsWith('/ruleset')) return 'ruleset';
  if (pathname.endsWith('/players')) return 'players';
  if (pathname.endsWith('/draw')) return 'draw';
  if (pathname.endsWith('/teams')) return 'teams';
  if (pathname.endsWith('/groups')) return 'groups';
  if (pathname.endsWith('/matches')) return 'matches';
  if (pathname.endsWith('/lineup')) return 'lineup';
  if (pathname.endsWith('/scoring')) return 'scoring';
  if (pathname.endsWith('/standings')) return 'standings';
  if (pathname.endsWith('/bracket')) return 'bracket';
  if (pathname.endsWith('/awards')) return 'awards';
  if (pathname.endsWith('/audit')) return 'audit';
  if (pathname.endsWith('/tournament')) return 'tournament';
  return 'dashboard';
}
```

Inside `TournamentLayout`, after loading tournament:

```tsx
const pathname = usePathname();
const router = useRouter();
const current = getCurrentUser();

useEffect(() => {
  if (!tournament) return;
  if (current.role === 'guest') {
    router.replace(tournament.publicEnabled && tournament.slug ? `/t/${tournament.slug}` : '/login');
    return;
  }

  const visibleAreas = new Set(getVisibleAreasForRole(current.role, {
    tournamentId: tournament.id,
    tournamentSlug: tournament.slug,
    status: tournament.status,
    publicEnabled: tournament.publicEnabled,
    hasTournamentInfo: true,
    hasValidRuleset: true,
    hasDependentSetupData: false,
    playerTotal: 0,
    maleCount: 0,
    femaleCount: 0,
    requiredPlayers: null,
    requiredMales: null,
    requiredFemales: null,
    teamCount: 0,
    groupsAssigned: false,
    scheduleConfigReady: false,
    matchCount: 0,
    lineupReadyCount: 0,
    scoringReadyCount: 0,
    completedMatchCount: 0,
    resultConfirmedMatchCount: 0,
    hasKnockoutStage: false,
    currentUserOwnsTeam: false,
  }));

  const area = areaFromPath(pathname);
  if (!visibleAreas.has(area)) {
    router.replace(`/admin/${tournament.id}`);
  }
}, [current.role, pathname, router, tournament]);
```

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors.

- [ ] **Step 4: Commit role-aware shell**

```bash
git add apps/web/src/components/sidebar.tsx 'apps/web/src/app/admin/[tournamentId]/layout.tsx'
git commit -m "feat(web): make admin shell role-aware"
```

---

### Task 6: Build Role-Aware Command Center Dashboard

**Files:**
- Modify: `apps/web/src/app/admin/[tournamentId]/page.tsx`
- Verify: `pnpm --filter @golab/web lint`

- [ ] **Step 1: Add policy and context imports**

Add imports:

```ts
import { ActionGate } from '@/components/action-gate';
import { getCurrentUser } from '@/lib/current-user';
import { buildTournamentUxContext } from '@/lib/tournament-ux-context';
import {
  getActionAccess,
  getHumanStatusLabel,
  getNextRecommendedAction,
  getPublishReadiness,
} from '@/lib/tournament-ux-policy';
```

- [ ] **Step 2: Include result-confirmed and readiness counts in dashboard stats**

Extend `DashboardStats`:

```ts
resultConfirmedMatches: number;
lineupReadyCount: number;
scoringReadyCount: number;
```

When loading matches:

```ts
resultConfirmedMatches: matches.filter((m) => m.status === 'RESULT_CONFIRMED').length,
lineupReadyCount: matches.filter((m) => m.status === 'LINEUP_READY' || m.status === 'READY').length,
scoringReadyCount: matches.filter((m) => ['READY', 'RUNNING', 'SEGMENT_BREAK', 'COMPLETED'].includes(m.status)).length,
```

- [ ] **Step 3: Derive role/context/policy state**

After `steps`, add:

```tsx
const current = getCurrentUser();
const uxContext = buildTournamentUxContext({
  tournament,
  stats: {
    playersCount: stats.playersCount,
    malesCount: stats.malesCount,
    femalesCount: stats.femalesCount,
    teamsCount: stats.teamsCount,
    matchesCount: stats.matchesCount,
    completedMatches: stats.completedMatches,
    resultConfirmedMatches: stats.resultConfirmedMatches,
    lineupReadyCount: stats.lineupReadyCount,
    scoringReadyCount: stats.scoringReadyCount,
  },
});
const nextAction = getNextRecommendedAction(current.role, uxContext);
const publishReadiness = getPublishReadiness(uxContext);
```

- [ ] **Step 4: Replace hardcoded quick actions with role-aware action cards**

Replace `quickActions` with:

```tsx
const commandActions = [
  {
    key: 'drawTeams' as const,
    href: `/admin/${tournament.id}/draw`,
    label: 'Bốc thăm đội',
    description: 'Chia đội khi đủ vận động viên theo ruleset.',
  },
  {
    key: 'generateMatches' as const,
    href: `/admin/${tournament.id}/groups`,
    label: 'Sinh lịch thi đấu',
    description: 'Cấu hình lịch mở sớm; sinh trận cần phân bảng trước.',
  },
  {
    key: 'submitLineup' as const,
    href: `/admin/${tournament.id}/lineup`,
    label: 'Nhập lineup',
    description: 'HLV/Captain khai báo đội hình từng trận.',
  },
  {
    key: 'scoreMatch' as const,
    href: `/admin/${tournament.id}/scoring`,
    label: 'Mở bàn trọng tài',
    description: 'Chấm điểm các trận đã sẵn sàng.',
  },
  {
    key: 'publishTournament' as const,
    href: `/admin/${tournament.id}/tournament`,
    label: 'Công khai giải',
    description: 'Chỉ mở khi giải đã hoàn tất theo checklist.',
  },
];
```

Render:

```tsx
<div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
  <div className="flex items-center justify-between gap-3 mb-4">
    <div>
      <h3 className="text-sm font-semibold text-slate-300">Việc cần làm tiếp theo</h3>
      <p className="text-xs text-slate-500 mt-1">{getHumanStatusLabel(tournament.status)}</p>
    </div>
    <StatusBadge status={tournament.status} size="md" />
  </div>
  <ActionGate
    access={{ allowed: true }}
    href={nextAction.href}
    label={nextAction.label}
    description={nextAction.description}
    className="border-amber-500/30 bg-amber-500/10"
  />
</div>

<div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
  <h3 className="text-sm font-semibold text-slate-300 mb-4">Việc theo vai trò</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
      <div className="text-xs text-slate-500">BTC</div>
      <div className="mt-1 text-lg font-bold text-slate-100">{publishReadiness.missing.length} mục cần theo dõi</div>
    </div>
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
      <div className="text-xs text-slate-500">Trọng tài</div>
      <div className="mt-1 text-lg font-bold text-slate-100">{stats.scoringReadyCount} trận sẵn sàng</div>
    </div>
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
      <div className="text-xs text-slate-500">HLV/Captain</div>
      <div className="mt-1 text-lg font-bold text-slate-100">{stats.lineupReadyCount} trận cần lineup</div>
    </div>
  </div>
</div>

<div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
  <h3 className="text-sm font-semibold text-slate-300 mb-4">Thao tác</h3>
  <div className="flex flex-col gap-2">
    {commandActions.map((action) => (
      <ActionGate
        key={action.key}
        access={getActionAccess(action.key, current.role, uxContext)}
        href={action.href}
        label={action.label}
        description={action.description}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 5: Run lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new dashboard lint errors.

- [ ] **Step 6: Commit command center**

```bash
git add 'apps/web/src/app/admin/[tournamentId]/page.tsx'
git commit -m "feat(web): add role-aware command center"
```

---

### Task 7: Apply Dependency Gates To Admin Action Pages

**Files:**
- Modify: `apps/web/src/app/admin/[tournamentId]/draw/page.tsx`
- Modify: `apps/web/src/app/admin/[tournamentId]/groups/page.tsx`
- Modify: `apps/web/src/app/admin/[tournamentId]/lineup/page.tsx`
- Modify: `apps/web/src/app/admin/[tournamentId]/scoring/page.tsx`
- Modify: `apps/web/src/app/admin/[tournamentId]/ruleset/page.tsx`
- Verify: `pnpm --filter @golab/web lint`

- [ ] **Step 1: Gate team draw buttons**

In draw page, build context from tournament and loaded data. Disable preview/confirm buttons using:

```tsx
const drawAccess = getActionAccess('drawTeams', getCurrentUser().role, uxContext);
```

Use:

```tsx
{!drawAccess.allowed && (
  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
    {drawAccess.reason}
  </div>
)}
```

Set button disabled:

```tsx
disabled={loading || !drawAccess.allowed}
```

- [ ] **Step 2: Split schedule UI on groups page**

On groups page, show two sections:

```tsx
<section className="card p-6 space-y-3">
  <h3 className="text-sm font-semibold text-slate-200">Cấu hình lịch</h3>
  <p className="text-xs text-slate-500">Có thể chuẩn bị sân, khung giờ và thời lượng trận ngay từ đầu.</p>
</section>

<section className="card p-6 space-y-3">
  <h3 className="text-sm font-semibold text-slate-200">Sinh lịch thi đấu</h3>
  {!generateAccess.allowed && <p className="text-xs text-amber-300">{generateAccess.reason}</p>}
</section>
```

Compute:

```tsx
const assignAccess = getActionAccess('assignGroups', getCurrentUser().role, uxContext);
const generateAccess = getActionAccess('generateMatches', getCurrentUser().role, uxContext);
```

Disable group assignment buttons with `!assignAccess.allowed`, and schedule generation buttons with `!generateAccess.allowed`.

- [ ] **Step 3: Gate lineup submission**

In lineup page:

```tsx
const lineupAccess = getActionAccess('submitLineup', getCurrentUser().role, uxContext);
```

If blocked, show:

```tsx
<EmptyState
  icon={ClipboardList}
  title="Chưa thể khai báo lineup"
  description={lineupAccess.reason || 'Chưa có trận cần khai báo lineup.'}
/>
```

Disable save/lock buttons with `!lineupAccess.allowed`.

- [ ] **Step 4: Gate scoring actions**

In scoring page:

```tsx
const scoreAccess = getActionAccess('scoreMatch', getCurrentUser().role, uxContext);
```

If blocked and `matches.length === 0`, render:

```tsx
<p className="text-muted text-center py-10 text-slate-500 text-xs">
  {scoreAccess.reason || 'Chưa có trận đấu nào đang chạy hoặc chờ xác nhận kết quả.'}
</p>
```

Keep result confirmation visible only when the current role is `scorer`, `btc_admin`, or `super_admin`.

- [ ] **Step 5: Gate ruleset editing by dependent data**

In ruleset page:

```tsx
const editAccess = getActionAccess('editRuleset', getCurrentUser().role, uxContext);
```

Render read-only banner when `!editAccess.allowed`:

```tsx
<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
  {editAccess.reason}
</div>
```

Do not show edit/save controls when `editAccess.allowed === false`.

- [ ] **Step 6: Run lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors in the action pages.

- [ ] **Step 7: Commit page gates**

```bash
git add 'apps/web/src/app/admin/[tournamentId]/draw/page.tsx' 'apps/web/src/app/admin/[tournamentId]/groups/page.tsx' 'apps/web/src/app/admin/[tournamentId]/lineup/page.tsx' 'apps/web/src/app/admin/[tournamentId]/scoring/page.tsx' 'apps/web/src/app/admin/[tournamentId]/ruleset/page.tsx'
git commit -m "fix(web): gate admin actions by dependencies"
```

---

### Task 8: Replace Guest Auto-Login With Public Read Endpoint

**Files:**
- Create: `apps/api/src/modules/public/public.service.ts`
- Create: `apps/api/src/modules/public/public.controller.ts`
- Create: `apps/api/src/modules/public/public.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/web/src/app/t/[slug]/page.tsx`
- Test: `apps/api/src/modules/public/public.service.spec.ts`

- [ ] **Step 1: Add failing public service test**

Create `apps/api/src/modules/public/public.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';

describe('PublicService', () => {
  it('rejects unpublished tournaments', async () => {
    const prisma = {
      tournament: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const service = new PublicService(prisma);

    await expect(service.getPublicTournament('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a read-only public payload for published tournaments', async () => {
    const prisma = {
      tournament: {
        findFirst: jest.fn().mockResolvedValue({
          id: 't1',
          name: 'GOLAB Cup',
          slug: 'golab-cup',
          venueName: 'Court A',
          openingTime: new Date('2026-06-14T08:00:00Z'),
          publicEnabled: true,
          status: 'PUBLISHED',
          ruleset: { name: 'Standard' },
          teams: [],
          matches: [],
          groups: [],
          standings: [],
        }),
      },
      bracketNode: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const service = new PublicService(prisma);

    await expect(service.getPublicTournament('golab-cup')).resolves.toMatchObject({
      tournament: { slug: 'golab-cup' },
      teams: [],
      matches: [],
    });
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @golab/api test -- public.service.spec.ts`

Expected: FAIL because `PublicService` does not exist.

- [ ] **Step 3: Implement PublicService**

Create `apps/api/src/modules/public/public.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicTournament(slug: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        slug,
        publicEnabled: true,
        status: { in: ['PUBLISHED', 'COMPLETED'] },
      },
      include: {
        ruleset: true,
        teams: {
          include: {
            captain: true,
            members: { include: { playerProfile: true } },
          },
          orderBy: { code: 'asc' },
        },
        matches: {
          include: {
            teamA: true,
            teamB: true,
            group: true,
            segments: true,
            scoreEvents: true,
          },
          orderBy: { matchNo: 'asc' },
        },
        groups: {
          include: {
            groupTeams: { include: { team: true }, orderBy: { seedOrder: 'asc' } },
          },
          orderBy: { code: 'asc' },
        },
        standings: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu chưa được công khai hoặc đường dẫn không đúng.');
    }

    const bracket = await this.prisma.bracketNode.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { roundNo: 'asc' },
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        venueName: tournament.venueName,
        openingTime: tournament.openingTime,
        status: tournament.status,
        ruleset: tournament.ruleset,
      },
      teams: tournament.teams,
      matches: tournament.matches,
      groups: tournament.groups,
      standings: tournament.standings,
      bracket,
    };
  }
}
```

- [ ] **Step 4: Add controller and module**

Create `apps/api/src/modules/public/public.controller.ts`:

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tournaments/:slug')
  async getPublicTournament(@Param('slug') slug: string) {
    return this.publicService.getPublicTournament(slug);
  }
}
```

Create `apps/api/src/modules/public/public.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
```

In `apps/api/src/app.module.ts`, add:

```ts
import { PublicModule } from './modules/public/public.module';
```

and include `PublicModule` in the `imports` array.

- [ ] **Step 5: Update public web page to use public endpoint**

In `apps/web/src/app/t/[slug]/page.tsx`, remove `ensureGuestAuthToken` and `publicApiFetch`. Replace `loadAllData` fetch logic with:

```ts
const res = await fetch(`/api/public/tournaments/${slug}`, {
  headers: { 'Content-Type': 'application/json' },
});
if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  throw new Error(data.message || 'Giải đấu chưa được công khai hoặc đường link không chính xác.');
}
const data = await res.json();
setTournament(data.tournament);
setMatches(data.matches);
setGroups(data.groups);
setStandings(data.standings);
setTeams(data.teams);
setBracket(data.bracket);
```

- [ ] **Step 6: Run tests and lint**

Run: `pnpm --filter @golab/api test -- public.service.spec.ts`

Expected: PASS.

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors in public page.

- [ ] **Step 7: Commit public guest endpoint**

```bash
git add apps/api/src/modules/public apps/api/src/app.module.ts 'apps/web/src/app/t/[slug]/page.tsx'
git commit -m "feat: add read-only public tournament endpoint"
```

---

### Task 9: Align Backend Mutation Guards With Dependency Policy

**Files:**
- Modify: `apps/api/src/modules/team/team.service.ts`
- Modify: `apps/api/src/modules/group/group.service.ts`
- Modify: `apps/api/src/modules/schedule/schedule.service.ts`
- Modify: `apps/api/src/modules/tournament/tournament.service.ts`
- Test: focused service specs for changed guards

- [ ] **Step 1: Tighten team draw dependency**

In `TeamService.createDrawPreview`, reject when players do not match ruleset. After registrations load and before draw:

```ts
const requiredTotal = 8 * composition.teamSize;
const requiredMale = 8 * composition.maleCount;
const requiredFemale = 8 * composition.femaleCount;
const actualMale = playersInput.filter((p) => p.gender === 'MALE').length;
const actualFemale = playersInput.filter((p) => p.gender === 'FEMALE').length;

if (playersInput.length !== requiredTotal || actualMale !== requiredMale || actualFemale !== requiredFemale) {
  throw new BadRequestException(
    `Bốc thăm đang khóa vì chưa đủ vận động viên. Cần ${requiredTotal} VĐV: ${requiredMale} nam, ${requiredFemale} nữ. Hiện có ${playersInput.length} VĐV: ${actualMale} nam, ${actualFemale} nữ.`
  );
}
```

- [ ] **Step 2: Guard group assignment by team count**

In `GroupService.assignTeams`, before assignment length validation:

```ts
const teamsCount = await this.prisma.team.count({ where: { tournamentId } });
if (teamsCount < 8) {
  throw new BadRequestException(`Phân bảng đang khóa vì chưa đủ đội. Hiện có ${teamsCount}/8 đội.`);
}
```

- [ ] **Step 3: Keep schedule config open and guard generation only**

Keep schedule metadata updates open for BTC/admin. In `ScheduleService.generateGroupStageSchedule`, keep the existing `GROUP_ASSIGNED` guard and change the message to:

```ts
throw new BadRequestException(
  `Sinh lịch thi đấu đang khóa vì chưa phân bảng. Hãy phân 8 đội vào bảng trước.`
);
```

- [ ] **Step 4: Guard publish by completion**

In `TournamentService.publish`, after `const t = await this.findOne(id);`, add:

```ts
if (t.status !== 'COMPLETED' && t.status !== 'PUBLISHED') {
  throw new BadRequestException('Chưa thể công khai giải vì giải chưa hoàn tất.');
}
```

- [ ] **Step 5: Add focused service tests**

Create `apps/api/src/modules/team/team.service.spec.ts` if it does not exist, or append this case if the file already exists:

```ts
import { TeamService } from './team.service';

describe('TeamService dependency guards', () => {
  it('rejects draw preview when player composition does not match ruleset', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          status: 'PLAYERS_READY',
          ruleset: {
            teamCompositionRule: {
              teamSize: 5,
              maleCount: 3,
              femaleCount: 2,
            },
          },
        }),
      },
      tournamentRegistration: {
        findMany: jest.fn().mockResolvedValue([
          { playerProfile: { id: 'p1', fullName: 'A', gender: 'MALE' } },
        ]),
      },
    } as any;

    const service = new TeamService(prisma, { log: jest.fn() } as any, {} as any);

    await expect(service.createDrawPreview('t1', undefined, 'u1')).rejects.toThrow('Bốc thăm đang khóa');
  });
});
```

Create `apps/api/src/modules/group/group.service.spec.ts` if it does not exist, or append this case if the file already exists:

```ts
import { GroupService } from './group.service';

describe('GroupService dependency guards', () => {
  it('rejects group assignment when confirmed teams are missing', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          status: 'TEAM_DRAW_COMPLETED',
        }),
      },
      team: {
        count: jest.fn().mockResolvedValue(2),
      },
    } as any;

    const service = new GroupService(prisma, { log: jest.fn() } as any);

    await expect(service.assignTeams('t1', [], 'u1')).rejects.toThrow('Phân bảng đang khóa');
  });
});
```

Create `apps/api/src/modules/tournament/tournament.service.spec.ts` if it does not exist, or append this case if the file already exists:

```ts
import { TournamentService } from './tournament.service';

describe('TournamentService publish guard', () => {
  it('rejects publishing before tournament completion', async () => {
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          organizationId: 'org1',
          status: 'RUNNING',
          ruleset: null,
        }),
      },
    } as any;

    const service = new TournamentService(prisma, { log: jest.fn() } as any);

    await expect(service.publish('t1', 'u1')).rejects.toThrow('giải chưa hoàn tất');
  });
});
```

- [ ] **Step 6: Run API tests**

Run: `pnpm --filter @golab/api test`

Expected: all API tests pass.

- [ ] **Step 7: Commit backend dependency guards**

```bash
git add apps/api/src/modules/team/team.service.ts apps/api/src/modules/group/group.service.ts apps/api/src/modules/schedule/schedule.service.ts apps/api/src/modules/tournament/tournament.service.ts apps/api/src/modules/**/*.spec.ts
git commit -m "fix(api): enforce dependency-based tournament guards"
```

---

### Task 10: Final Verification

**Files:**
- No planned source edits unless verification finds a defect.

- [ ] **Step 1: Run web policy tests**

Run: `pnpm --filter @golab/web test`

Expected: all web policy tests pass.

- [ ] **Step 2: Run web lint**

Run: `pnpm --filter @golab/web lint`

Expected: no new lint errors.

- [ ] **Step 3: Run API tests**

Run: `pnpm --filter @golab/api test`

Expected: all API tests pass.

- [ ] **Step 4: Run builds**

Run: `pnpm build:web`

Expected: Next.js build succeeds.

Run: `pnpm build:api`

Expected: NestJS build succeeds.

- [ ] **Step 5: Manual role smoke test**

Run: `pnpm dev`

Verify:

- Guest can open `/t/<slug>` only when the tournament is public/completed/published and sees no operational controls.
- Unauthenticated user visiting `/admin/<id>` redirects to public page when public, otherwise login.
- BTC/admin sees command center, setup areas, and dependency-gated actions.
- Scorer sees scoring work only.
- Captain sees lineup/team work only.
- Schedule setup is visible early.
- Match generation is locked until groups exist.
- Team draw is locked until valid ruleset and player composition exist.
- Publish is locked until tournament completion.

- [ ] **Step 6: Commit final fixes if verification required changes**

If verification required changes:

```bash
git add <fixed-files>
git commit -m "fix: address role-aware ux verification"
```

If verification did not require changes, do not create an empty commit.
