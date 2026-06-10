import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';
import { TournamentStatus, EventType } from '@golab/contracts';

export class Tournament extends Entity<string> {
  private _status: TournamentStatus;
  private _eventType: EventType;

  constructor(id: string, status: TournamentStatus, eventType: EventType = 'TEAM_EVENT') {
    super(id);
    this._status = status;
    this._eventType = eventType;
  }

  get status(): TournamentStatus {
    return this._status;
  }

  get eventType(): EventType {
    return this._eventType;
  }

  /**
   * Checks if a transition from current status to target status is valid.
   *
   * TEAM_EVENT flow (bốc thăm đội bắt buộc):
   *   DRAFT → PLAYER_IMPORT → PLAYERS_READY → TEAM_DRAW_COMPLETED → GROUP_ASSIGNED
   *   → SCHEDULE_GENERATED → RUNNING → GROUP_COMPLETED → KNOCKOUT_GENERATED
   *   → KNOCKOUT_RUNNING → COMPLETED → PUBLISHED
   *
   * SINGLES / DOUBLES flow (không có bước bốc thăm):
   *   DRAFT → PLAYER_IMPORT → PLAYERS_READY → GROUP_ASSIGNED
   *   → SCHEDULE_GENERATED → RUNNING → GROUP_COMPLETED → KNOCKOUT_GENERATED
   *   → KNOCKOUT_RUNNING → COMPLETED → PUBLISHED
   */
  public canTransitionTo(target: TournamentStatus): boolean {
    const isTeamEvent = this._eventType === 'TEAM_EVENT';

    const transitions: Record<TournamentStatus, TournamentStatus[]> = {
      DRAFT: ['PLAYER_IMPORT'],
      PLAYER_IMPORT: ['DRAFT', 'PLAYERS_READY'],
      // TEAM_EVENT: PLAYERS_READY → TEAM_DRAW_COMPLETED
      // SINGLES/DOUBLES: PLAYERS_READY → GROUP_ASSIGNED (bỏ qua TEAM_DRAW)
      PLAYERS_READY: isTeamEvent
        ? ['PLAYER_IMPORT', 'TEAM_DRAW_COMPLETED']
        : ['PLAYER_IMPORT', 'GROUP_ASSIGNED'],
      // TEAM_DRAW_COMPLETED chỉ xuất hiện trong flow TEAM_EVENT
      TEAM_DRAW_COMPLETED: ['PLAYERS_READY', 'GROUP_ASSIGNED'],
      GROUP_ASSIGNED: isTeamEvent
        ? ['TEAM_DRAW_COMPLETED', 'SCHEDULE_GENERATED']
        : ['PLAYERS_READY', 'SCHEDULE_GENERATED'],
      SCHEDULE_GENERATED: ['GROUP_ASSIGNED', 'RUNNING'],
      RUNNING: ['SCHEDULE_GENERATED', 'GROUP_COMPLETED'],
      GROUP_COMPLETED: ['RUNNING', 'KNOCKOUT_GENERATED', 'COMPLETED'],
      KNOCKOUT_GENERATED: ['GROUP_COMPLETED', 'KNOCKOUT_RUNNING'],
      KNOCKOUT_RUNNING: ['KNOCKOUT_GENERATED', 'COMPLETED'],
      COMPLETED: ['PUBLISHED'],
      PUBLISHED: ['DRAFT'],
    };
    return transitions[this._status]?.includes(target) ?? false;
  }

  /**
   * Advances the status of the tournament if the transition is allowed.
   */
  public transitionTo(target: TournamentStatus): void {
    if (!this.canTransitionTo(target)) {
      throw new ValidationError(
        `Không thể chuyển đổi trạng thái giải đấu từ ${this._status} sang ${target}.`
      );
    }
    this._status = target;
  }
}
