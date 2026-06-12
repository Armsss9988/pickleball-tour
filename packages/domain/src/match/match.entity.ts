import { Entity } from '../shared/entity.base';
import { ValidationError, InvalidStateError } from '../shared/errors.base';

export interface MatchProps {
  tournamentId: string;
  stageId: string;
  groupId?: string | null;
  roundNo?: number | null;
  matchNo?: number | null;
  label?: string | null;
  teamAId: string | null;
  teamBId: string | null;
  status: 'SCHEDULED' | 'LINEUP_PENDING' | 'LINEUP_READY' | 'READY' | 'RUNNING' | 'SEGMENT_BREAK' | 'COMPLETED' | 'RESULT_CONFIRMED' | 'CANCELLED';
  winnerTeamId?: string | null;
  scheduledTime?: Date | null;
  courtName?: string | null;
}

export class Match extends Entity<string> {
  private _props: MatchProps;

  constructor(id: string, props: MatchProps) {
    super(id);
    this._props = { ...props };
    this.validate();
  }

  get tournamentId(): string {
    return this._props.tournamentId;
  }

  get stageId(): string {
    return this._props.stageId;
  }

  get groupId(): string | null | undefined {
    return this._props.groupId;
  }

  get roundNo(): number | null | undefined {
    return this._props.roundNo;
  }

  get matchNo(): number | null | undefined {
    return this._props.matchNo;
  }

  get label(): string | null | undefined {
    return this._props.label;
  }

  get teamAId(): string | null {
    return this._props.teamAId;
  }

  get teamBId(): string | null {
    return this._props.teamBId;
  }

  get status(): MatchProps['status'] {
    return this._props.status;
  }

  get winnerTeamId(): string | null | undefined {
    return this._props.winnerTeamId;
  }

  get scheduledTime(): Date | null | undefined {
    return this._props.scheduledTime;
  }

  get courtName(): string | null | undefined {
    return this._props.courtName;
  }

  private validate(): void {
    if (!this._props.tournamentId) {
      throw new ValidationError('Mã giải đấu không được trống.');
    }
    if (!this._props.stageId) {
      throw new ValidationError('Mã giai đoạn không được trống.');
    }
  }

  /**
   * Checks if status transition is allowed.
   */
  public canTransitionTo(target: MatchProps['status']): boolean {
    const transitions: Record<MatchProps['status'], MatchProps['status'][]> = {
      SCHEDULED: ['LINEUP_PENDING', 'READY', 'CANCELLED'],
      LINEUP_PENDING: ['LINEUP_READY', 'READY', 'SCHEDULED', 'CANCELLED'],
      LINEUP_READY: ['READY', 'LINEUP_PENDING', 'CANCELLED'],
      READY: ['RUNNING', 'LINEUP_READY', 'CANCELLED'],
      RUNNING: ['SEGMENT_BREAK', 'COMPLETED', 'CANCELLED'],
      SEGMENT_BREAK: ['RUNNING', 'CANCELLED'],
      COMPLETED: ['RESULT_CONFIRMED'],
      RESULT_CONFIRMED: [],
      CANCELLED: [],
    };
    return transitions[this._props.status]?.includes(target) ?? false;
  }

  /**
   * Performs the transition.
   */
  public transitionTo(target: MatchProps['status']): void {
    if (!this.canTransitionTo(target)) {
      throw new InvalidStateError(
        `Không thể chuyển đổi trạng thái trận đấu từ ${this._props.status} sang ${target}.`
      );
    }
    this._props.status = target;
  }

  /**
   * Confirms result and assigns winner.
   */
  public confirmResult(winnerId: string): void {
    if (this._props.status !== 'COMPLETED') {
      throw new InvalidStateError('Trận đấu phải ở trạng thái COMPLETED trước khi xác nhận kết quả.');
    }
    if (winnerId !== this._props.teamAId && winnerId !== this._props.teamBId) {
      throw new ValidationError('Đội chiến thắng phải là Đội A hoặc Đội B.');
    }
    this._props.winnerTeamId = winnerId;
    this.transitionTo('RESULT_CONFIRMED');
  }
}
