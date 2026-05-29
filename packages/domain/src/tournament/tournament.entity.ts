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
      DRAFT: ['PUBLISHED'],
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
