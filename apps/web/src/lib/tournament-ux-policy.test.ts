import { describe, expect, it } from 'vitest';
import {
  getActionAccess,
  getHumanStatusLabel,
  getNextRecommendedAction,
  getPublishReadiness,
  getVisibleAreasForRole,
  type TournamentUxContext,
} from './tournament-ux-policy';
import { buildTournamentUxContext } from './tournament-ux-context';

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

  it('shows setup and operations areas to BTC admin', () => {
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('control-room');
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('players');
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('schedule');
    expect(getVisibleAreasForRole('btc_admin', baseContext)).toContain('publish');
  });

  it('shows the control room to super admin', () => {
    expect(getVisibleAreasForRole('super_admin', baseContext)).toContain('control-room');
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

  it('unlocks match generation from persisted group data even before tournament status reloads', () => {
    const context = buildTournamentUxContext({
      tournament: {
        id: 't1',
        status: 'TEAM_DRAW_COMPLETED',
        openingTime: '2026-06-05T08:00:00.000Z',
      },
      stats: {
        teamsCount: 8,
        groupsAssigned: true,
      },
    });

    expect(context.groupsAssigned).toBe(true);
    expect(getActionAccess('generateMatches', 'btc_admin', context).allowed).toBe(true);
  });

  it('keeps match generation locked when loaded group data is empty despite stale status', () => {
    const context = buildTournamentUxContext({
      tournament: {
        id: 't1',
        status: 'GROUP_ASSIGNED',
        openingTime: '2026-06-05T08:00:00.000Z',
      },
      stats: {
        teamsCount: 8,
        groupsAssigned: false,
      },
    });

    const access = getActionAccess('generateMatches', 'btc_admin', context);
    expect(context.groupsAssigned).toBe(false);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('chưa phân bảng');
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
    expect(access.locked).toBe(true);
    expect(access.reason).toBe('Ruleset đang khóa vì đã có dữ liệu phụ thuộc như vận động viên, đội, lịch hoặc điểm số.');
    expect(access.required).toBe('Muốn sửa ruleset, hãy dùng luồng rollback có kiểm soát.');
    expect(access.nextLabel).toBe('Mở trang ruleset');
    expect(access.nextHref).toBe('/admin/t1/ruleset');
  });

  it('allows publish readiness only after tournament completion', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      hasDependentSetupData: true,
      playerTotal: 40,
      maleCount: 24,
      femaleCount: 16,
      requiredPlayers: 40,
      requiredMales: 24,
      requiredFemales: 16,
      groupsAssigned: true,
      scheduleConfigReady: true,
      teamCount: 8,
      matchCount: 12,
      completedMatchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'COMPLETED',
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);

    const access = getActionAccess('publishTournament', 'btc_admin', {
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      hasDependentSetupData: true,
      playerTotal: 40,
      maleCount: 24,
      femaleCount: 16,
      requiredPlayers: 40,
      requiredMales: 24,
      requiredFemales: 16,
      groupsAssigned: true,
      scheduleConfigReady: true,
      teamCount: 8,
      matchCount: 12,
      completedMatchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'PUBLISHED',
    });
    expect(access.allowed).toBe(true);
  });

  it('allows publish readiness while tournament is still running', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      hasDependentSetupData: true,
      playerTotal: 40,
      maleCount: 24,
      femaleCount: 16,
      requiredPlayers: 40,
      requiredMales: 24,
      requiredFemales: 16,
      groupsAssigned: true,
      scheduleConfigReady: true,
      teamCount: 8,
      matchCount: 12,
      completedMatchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'RUNNING',
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);
  });

  it('reports only the basic publish blockers', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      status: 'KNOCKOUT_RUNNING',
      hasKnockoutStage: true,
      teamCount: 7,
      matchCount: 4,
      resultConfirmedMatchCount: 3,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual([
      'thông tin giải',
      'ruleset',
    ]);
  });

  it('accepts the full tournament status contract in context', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      status: 'TEAM_DRAW_COMPLETED',
    });

    expect(readiness.ready).toBe(false);
  });

  it('maps technical status to human labels', () => {
    expect(getHumanStatusLabel('DRAFT')).toBe('Nháp (Đang chuẩn bị)');
    expect(getHumanStatusLabel('PUBLISHED')).toBe('Đã công khai');
  });

  it('returns the next action from missing dependencies', () => {
    const next = getNextRecommendedAction('btc_admin', baseContext);
    expect(next.key).toBe('editTournament');
    expect(next.label).toContain('Bổ sung thông tin giải');
  });
});
