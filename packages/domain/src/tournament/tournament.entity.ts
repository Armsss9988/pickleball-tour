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
      PLAYER_IMPORT: ['PLAYERS_READY', 'DRAFT'],
      PLAYERS_READY: ['TEAM_DRAW_COMPLETED', 'PLAYER_IMPORT'],
      TEAM_DRAW_COMPLETED: ['GROUP_ASSIGNED', 'PLAYERS_READY'],
      GROUP_ASSIGNED: ['SCHEDULE_GENERATED', 'TEAM_DRAW_COMPLETED'],
      SCHEDULE_GENERATED: ['RUNNING', 'GROUP_ASSIGNED'],
      RUNNING: ['GROUP_COMPLETED'],
      GROUP_COMPLETED: ['KNOCKOUT_GENERATED', 'RUNNING'],
      KNOCKOUT_GENERATED: ['KNOCKOUT_RUNNING', 'GROUP_COMPLETED'],
      KNOCKOUT_RUNNING: ['COMPLETED'],
      COMPLETED: ['PUBLISHED'],
      PUBLISHED: [],
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

  /**
   * Configuration is locked once we move past DRAFT state.
   */
  public isRulesetLocked(): boolean {
    return this._status !== 'DRAFT';
  }

  /**
   * Teams / Draw is locked once we proceed to assign groups.
   */
  public isTeamDrawLocked(): boolean {
    const unlockedStates: TournamentStatus[] = ['DRAFT', 'PLAYER_IMPORT', 'PLAYERS_READY', 'TEAM_DRAW_COMPLETED'];
    return !unlockedStates.includes(this._status);
  }
}
