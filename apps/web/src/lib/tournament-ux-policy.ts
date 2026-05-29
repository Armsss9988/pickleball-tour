export type AppRole = 'guest' | 'btc_admin' | 'scorer' | 'captain' | 'super_admin';

export type TournamentStatus = 'DRAFT' | 'PUBLISHED';

export type TournamentPhase =
  | 'DRAFT'
  | 'PUBLISHED_BEFORE_START'
  | 'PUBLISHED_NOT_READY'
  | 'PUBLISHED_RUNNING';

export type AreaKey =
  | 'public'
  | 'dashboard'
  | 'tournament'
  | 'ruleset'
  | 'players'
  | 'draw'
  | 'schedule'
  | 'teams'
  | 'groups'
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
  phase: TournamentPhase;
  openingTime: Date | string | null;
  publicEnabled: boolean;
  hasTournamentInfo: boolean;
  hasValidRuleset: boolean;
  isRulesetLocked: boolean;
  canUnpublish: boolean;
  isOperationallyReady: boolean;
  hasScoredMatches: boolean;
  sectionStatuses: Record<string, 'EMPTY' | 'VALID' | 'INVALID' | 'NEEDS_REVIEW'>;
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
  locked?: boolean;
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

export interface DependencyWarning {
  area: AreaKey;
  severity: 'error' | 'warning';
  label: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
}

const adminAreas: AreaKey[] = [
  'dashboard',
  'tournament',
  'ruleset',
  'players',
  'draw',
  'schedule',
  'teams',
  'groups',
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
  DRAFT: 'Nháp (Đang chuẩn bị)',
  PUBLISHED: 'Đã công khai',
};

const phaseLabels: Record<string, string> = {
  DRAFT: 'Nháp (Đang chuẩn bị)',
  PUBLISHED_BEFORE_START: 'Đã công khai (Chưa bắt đầu)',
  PUBLISHED_NOT_READY: 'Đã công khai (Thiếu cấu hình vận hành)',
  PUBLISHED_RUNNING: 'Đang diễn ra',
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
  return statusLabels[status] ?? status;
}

export function getHumanPhaseLabel(phase?: string | null): string {
  if (!phase) return 'Chưa rõ giai đoạn';
  return phaseLabels[phase] ?? phase;
}

export function getVisibleAreasForRole(role: AppRole, context: TournamentUxContext): AreaKey[] {
  if (role === 'guest') return ['public'];
  if (role === 'scorer') return ['scoring'];
  if (role === 'captain') return ['lineup', 'team-schedule', 'team-results'];
  if (role === 'super_admin') return adminAreas;
  return adminAreas;
}

export function getAreaAccess(area: AreaKey, role: AppRole, context: TournamentUxContext): AccessResult {
  // Guest can only view public
  if (role === 'guest') {
    if (area === 'public') return { allowed: true };
    return forbidden(role);
  }

  // BTC Admin / Super Admin can access all admin areas, but let's check validation dependencies if needed
  if (role === 'super_admin' || role === 'btc_admin') {
    switch (area) {
      case 'public':
        return { allowed: true };

      case 'draw': {
        // Draw requires ruleset validation and player verification
        if (!context.hasValidRuleset) {
          return {
            allowed: false,
            reason: 'Chưa bốc thăm được vì ruleset chưa hợp lệ.',
            required: 'Thiết lập ruleset trước.',
            nextLabel: 'Mở thiết lập ruleset',
            nextHref: `/admin/${context.tournamentId}/ruleset`,
          };
        }
        if (!hasValidPlayerComposition(context)) {
          return {
            allowed: false,
            reason: `Chưa bốc thăm được vì danh sách vận động viên chưa hợp lệ. ${playerRequirementText(context)}`,
            required: 'Nhập đủ số lượng VĐV theo ruleset.',
            nextLabel: 'Mở trang VĐV',
            nextHref: `/admin/${context.tournamentId}/players`,
          };
        }
        return { allowed: true };
      }

      case 'groups': {
        // Group requires teams drawn
        if (context.teamCount < 2) {
          return {
            allowed: false,
            reason: 'Chưa phân bảng được vì chưa bốc thăm tạo đội.',
            required: 'Tiến hành bốc thăm tạo đội trước.',
            nextLabel: 'Mở bốc thăm',
            nextHref: `/admin/${context.tournamentId}/draw`,
          };
        }
        return { allowed: true };
      }

      case 'matches':
      case 'schedule': {
        // Matches / schedule requires groups assigned
        if (!context.groupsAssigned) {
          return {
            allowed: false,
            reason: 'Chưa xem lịch/sân thi đấu được vì chưa phân chia bảng đấu.',
            required: 'Chia các đội vào bảng đấu trước.',
            nextLabel: 'Mở phân bảng',
            nextHref: `/admin/${context.tournamentId}/groups`,
          };
        }
        return { allowed: true };
      }

      case 'scoring': {
        // Scoring is allowed if phase is PUBLISHED_RUNNING or can be opened for preparation
        // If phase is PUBLISHED_NOT_READY, scoring is locked
        if (context.phase === 'PUBLISHED_NOT_READY') {
          return {
            allowed: false,
            reason: 'Trang chấm điểm đang khóa do giải đấu chưa hoàn tất thiết lập vận hành.',
            required: 'Hoàn tất các bước thiết lập vận hành.',
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  // Scorer can only access scoring area
  if (role === 'scorer') {
    if (area === 'scoring') {
      if (context.phase === 'PUBLISHED_NOT_READY') {
        return {
          allowed: false,
          reason: 'Trang chấm điểm đang khóa do giải đấu chưa hoàn tất thiết lập vận hành.',
        };
      }
      return { allowed: true };
    }
    return forbidden(role);
  }

  // Captain can access lineup, team-schedule, team-results
  if (role === 'captain') {
    if (['lineup', 'team-schedule', 'team-results'].includes(area)) {
      if (area === 'lineup' && context.matchCount === 0) {
        return {
          allowed: false,
          reason: 'Chưa khai báo đội hình ra sân được vì chưa sinh lịch thi đấu.',
        };
      }
      return { allowed: true };
    }
    return forbidden(role);
  }

  return forbidden(role);
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
      if (context.isRulesetLocked) {
        return {
          allowed: false,
          locked: true,
          reason: 'Ruleset đã bị khóa sau khi giải bắt đầu và có điểm số.',
          required: 'Không thể sửa đổi luật thi đấu lúc này.',
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
      if (context.teamCount < 2) {
        return {
          allowed: false,
          reason: `Phân bảng đang khóa vì chưa có tối thiểu 2 đội.`,
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
          required: 'Hãy phân đội vào bảng trước.',
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
      if (context.phase === 'PUBLISHED_NOT_READY') {
        return {
          allowed: false,
          reason: 'Chấm điểm đang bị khóa do giải đấu chưa hoàn thiện các thiết lập vận hành bắt buộc.',
          required: 'BTC cần cấu hình đầy đủ ruleset, đội và lịch thi đấu.',
        };
      }
      return { allowed: true };
    }
    case 'confirmResults': {
      if (role !== 'scorer' && role !== 'btc_admin' && role !== 'super_admin') return forbidden(role);
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
          required: 'Hoàn tất các mục thông tin giải và ruleset.',
          nextLabel: 'Xem thông tin giải',
          nextHref: `/admin/${context.tournamentId}/tournament`,
        };
      }
      return { allowed: true };
    }
  }
}

export function getDependencyWarnings(context: TournamentUxContext): DependencyWarning[] {
  const warnings: DependencyWarning[] = [];

  // Warn if ruleset section is invalid/empty/needs review
  const rulesetStatus = context.sectionStatuses.ruleset;
  if (rulesetStatus && rulesetStatus !== 'VALID') {
    warnings.push({
      area: 'ruleset',
      severity: 'error',
      label: 'Luật thi đấu chưa hợp lệ',
      reason: 'Luật thi đấu cần được kiểm tra lại do có thay đổi hoặc thiết lập chưa đầy đủ.',
      actionLabel: 'Cấu hình luật thi đấu',
      actionHref: `/admin/${context.tournamentId}/ruleset`,
    });
  }

  // Warn if players section is invalid
  const playersStatus = context.sectionStatuses.players;
  if (playersStatus && playersStatus !== 'VALID') {
    warnings.push({
      area: 'players',
      severity: 'warning',
      label: 'Vận động viên chưa đủ điều kiện',
      reason: playerRequirementText(context),
      actionLabel: 'Quản lý VĐV',
      actionHref: `/admin/${context.tournamentId}/players`,
    });
  }

  // Warn if teams section is invalid
  const teamsStatus = context.sectionStatuses.teams;
  if (teamsStatus && teamsStatus !== 'VALID') {
    warnings.push({
      area: 'teams',
      severity: 'warning',
      label: 'Đội thi đấu chưa hợp lệ',
      reason: 'Danh sách đội hoặc giới tính/số lượng thành viên đội không khớp với ruleset.',
      actionLabel: 'Bốc thăm/Quản lý đội',
      actionHref: `/admin/${context.tournamentId}/draw`,
    });
  }

  // Warn if schedule section is invalid
  const scheduleStatus = context.sectionStatuses.schedule;
  if (scheduleStatus && scheduleStatus !== 'VALID') {
    warnings.push({
      area: 'schedule',
      severity: 'warning',
      label: 'Lịch thi đấu chưa hoàn thiện hoặc có xung đột',
      reason: 'Một số trận đấu chưa được chia sân/giờ hoặc phát hiện trùng lịch thi đấu.',
      actionLabel: 'Quản lý lịch & sân',
      actionHref: `/admin/${context.tournamentId}/schedule`,
    });
  }

  return warnings;
}

export function getPublishReadiness(context: TournamentUxContext): PublishReadiness {
  const missing: string[] = [];
  if (!context.hasTournamentInfo) missing.push('thông tin giải');
  if (!context.hasValidRuleset) missing.push('ruleset');
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
      description: 'Nhập địa điểm, thời gian khai mạc và hạn đăng ký.',
      href: `/admin/${context.tournamentId}/tournament`,
    };
  }
  if (!context.hasValidRuleset) {
    return {
      key: 'editRuleset',
      label: 'Cấu hình ruleset',
      description: 'Cấu hình các chặng thi đấu và cách tính điểm.',
      href: `/admin/${context.tournamentId}/ruleset`,
    };
  }
  if (context.playerTotal === 0) {
    return {
      key: 'addPlayers',
      label: 'Nhập vận động viên',
      description: playerRequirementText(context),
      href: `/admin/${context.tournamentId}/players`,
    };
  }
  if (context.teamCount < 2) {
    return {
      key: 'drawTeams',
      label: 'Bốc thăm chia đội',
      description: 'Bốc thăm chia đội ngẫu nhiên dựa trên danh sách VĐV.',
      href: `/admin/${context.tournamentId}/draw`,
    };
  }
  if (!context.groupsAssigned) {
    return {
      key: 'assignGroups',
      label: 'Phân chia bảng đấu',
      description: 'Chia đội vào bảng đấu để chuẩn bị sinh lịch thi đấu.',
      href: `/admin/${context.tournamentId}/groups`,
    };
  }
  if (context.matchCount === 0) {
    return {
      key: 'generateMatches',
      label: 'Sinh lịch thi đấu',
      description: 'Sinh các trận đấu vòng bảng dựa trên bảng đấu.',
      href: `/admin/${context.tournamentId}/groups`,
    };
  }
  return {
    key: 'publishTournament',
    label: context.status === 'PUBLISHED' ? 'Quản lý giải đấu' : 'Công khai giải đấu',
    description: context.status === 'PUBLISHED'
      ? 'Giải đấu đã được công khai.'
      : 'Giải đấu của bạn đã sẵn sàng để công khai.',
    href: `/admin/${context.tournamentId}`,
  };
}
