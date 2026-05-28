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
