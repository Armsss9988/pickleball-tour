import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';
import { TournamentStatus } from '@golab/contracts';

export class Tournament extends Entity<string> {
  private _status: TournamentStatus;

  constructor(id: string, status: TournamentStatus) {
    super(id);
    this._status = status;
  }

  get status(): TournamentStatus {
    return this._status;
  }

  /**
   * Checks if a transition from current status to target status is valid.
   */
  public canTransitionTo(target: TournamentStatus): boolean {
    const transitions: Record<TournamentStatus, TournamentStatus[]> = {
      DRAFT: ['PLAYER_IMPORT'],
      PLAYER_IMPORT: ['DRAFT', 'PLAYERS_READY'],
      PLAYERS_READY: ['PLAYER_IMPORT', 'TEAM_DRAW_COMPLETED'],
      TEAM_DRAW_COMPLETED: ['PLAYERS_READY', 'GROUP_ASSIGNED'],
      GROUP_ASSIGNED: ['TEAM_DRAW_COMPLETED', 'SCHEDULE_GENERATED'],
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
      throw new ValidationError(`Không thể chuyển đổi trạng thái giải đấu từ ${this._status} sang ${target}.`);
    }
    this._status = target;
  }
}
