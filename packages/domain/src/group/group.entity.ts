import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';

export interface GroupProps {
  name: string;
  stageId: string;
  tournamentId: string;
  teamIds: string[];
}

export class Group extends Entity<string> {
  private _props: GroupProps;

  constructor(id: string, props: GroupProps) {
    super(id);
    this._props = { ...props, teamIds: props.teamIds ? [...props.teamIds] : [] };
    this.validate();
  }

  get name(): string {
    return this._props.name;
  }

  get stageId(): string {
    return this._props.stageId;
  }

  get tournamentId(): string {
    return this._props.tournamentId;
  }

  get teamIds(): string[] {
    return this._props.teamIds;
  }

  private validate(): void {
    if (!this._props.name || this._props.name.trim() === '') {
      throw new ValidationError('Tên bảng không được để trống.');
    }
  }

  /**
   * Checks if group team size is standard.
   */
  public hasValidTeamSize(expectedSize = 4): boolean {
    return this._props.teamIds.length === expectedSize;
  }
}
