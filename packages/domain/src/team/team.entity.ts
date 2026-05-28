import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';

export interface TeamMemberProps {
  id: string;
  playerId: string;
  playerName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  role: 'CAPTAIN' | 'MEMBER';
}

export interface TeamProps {
  name: string;
  code: string;
  captainPlayerId?: string | null;
  seedNo?: number | null;
  members: TeamMemberProps[];
}

export class Team extends Entity<string> {
  private _props: TeamProps;

  constructor(id: string, props: TeamProps) {
    super(id);
    this._props = { ...props, members: props.members ? [...props.members] : [] };
    this.validate();
  }

  get name(): string {
    return this._props.name;
  }

  get code(): string {
    return this._props.code;
  }

  get captainPlayerId(): string | null | undefined {
    return this._props.captainPlayerId;
  }

  get seedNo(): number | null | undefined {
    return this._props.seedNo;
  }

  get members(): TeamMemberProps[] {
    return this._props.members;
  }

  private validate(): void {
    if (!this._props.name || this._props.name.trim() === '') {
      throw new ValidationError('Tên đội không được để trống.');
    }
    if (!this._props.code || this._props.code.trim() === '') {
      throw new ValidationError('Mã đội không được để trống.');
    }
  }

  /**
   * Helper to check if composition satisfies standard requirements.
   */
  public satisfiesComposition(requiredMale: number, requiredFemale: number): boolean {
    const males = this._props.members.filter((m) => m.gender === 'MALE').length;
    const females = this._props.members.filter((m) => m.gender === 'FEMALE').length;
    return males === requiredMale && females === requiredFemale;
  }
}
