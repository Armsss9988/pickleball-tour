import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';

export interface BracketNodeProps {
  organizationId: string;
  tournamentId: string;
  stageId: string;
  nodeKey: string;
  roundName: string;
  matchId?: string | null;
  sourceA?: string | null;
  sourceB?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  winnerToNodeKey?: string | null;
  loserAwardKey?: string | null;
  orderNo?: number | null;
}

export class BracketNode extends Entity<string> {
  private _props: BracketNodeProps;

  constructor(id: string, props: BracketNodeProps) {
    super(id);
    this._props = { ...props };
    this.validate();
  }

  get organizationId(): string {
    return this._props.organizationId;
  }

  get tournamentId(): string {
    return this._props.tournamentId;
  }

  get stageId(): string {
    return this._props.stageId;
  }

  get nodeKey(): string {
    return this._props.nodeKey;
  }

  get roundName(): string {
    return this._props.roundName;
  }

  get matchId(): string | null | undefined {
    return this._props.matchId;
  }

  get sourceA(): string | null | undefined {
    return this._props.sourceA;
  }

  get sourceB(): string | null | undefined {
    return this._props.sourceB;
  }

  get teamAId(): string | null | undefined {
    return this._props.teamAId;
  }

  get teamBId(): string | null | undefined {
    return this._props.teamBId;
  }

  get winnerToNodeKey(): string | null | undefined {
    return this._props.winnerToNodeKey;
  }

  get loserAwardKey(): string | null | undefined {
    return this._props.loserAwardKey;
  }

  get orderNo(): number | null | undefined {
    return this._props.orderNo;
  }

  public setMatchId(matchId: string | null): void {
    this._props.matchId = matchId;
  }

  public setTeams(teamAId: string | null, teamBId: string | null): void {
    this._props.teamAId = teamAId;
    this._props.teamBId = teamBId;
  }

  private validate(): void {
    if (!this._props.nodeKey) {
      throw new ValidationError('Khóa nút bracket không được để trống.');
    }
    if (!this._props.roundName) {
      throw new ValidationError('Tên vòng đấu không được để trống.');
    }
  }

  /**
   * Helper to check if both slots are resolved.
   */
  public isReadyToSchedule(): boolean {
    return !!(this._props.teamAId && this._props.teamBId && !this._props.matchId);
  }
}
