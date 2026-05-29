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
  phase: 'DRAFT',
  publicEnabled: false,
  hasTournamentInfo: false,
  hasValidRuleset: false,
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
  isRulesetLocked: false,
  canUnpublish: true,
  isOperationallyReady: false,
  hasScoredMatches: false,
  sectionStatuses: {},
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

  it('locks ruleset editing after ruleset is locked', () => {
    const access = getActionAccess('editRuleset', 'btc_admin', {
      ...baseContext,
      isRulesetLocked: true,
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('Ruleset đã bị khóa');
  });

  it('allows publish readiness before public mode is enabled', () => {
    const readiness = getPublishReadiness({
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      teamCount: 8,
      matchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'PUBLISHED',
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);

    const access = getActionAccess('publishTournament', 'btc_admin', {
      ...baseContext,
      hasTournamentInfo: true,
      hasValidRuleset: true,
      teamCount: 8,
      matchCount: 12,
      resultConfirmedMatchCount: 12,
      status: 'PUBLISHED',
    });
    expect(access.allowed).toBe(true);
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
