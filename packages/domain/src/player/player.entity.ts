import { Entity } from '../shared/entity.base';
import { ValidationError } from '../shared/errors.base';

export interface PlayerProps {
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  phone?: string | null;
  note?: string | null;
}

export class Player extends Entity<string> {
  private _props: PlayerProps;

  constructor(id: string, props: PlayerProps) {
    super(id);
    this._props = { ...props };
    this.validate();
  }

  get fullName(): string {
    return this._props.fullName;
  }

  get gender(): 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' {
    return this._props.gender;
  }

  get phone(): string | null | undefined {
    return this._props.phone;
  }

  get note(): string | null | undefined {
    return this._props.note;
  }

  private validate(): void {
    if (!this._props.fullName || this._props.fullName.trim() === '') {
      throw new ValidationError('Tên vận động viên không được để trống.');
    }
    if (!['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].includes(this._props.gender)) {
      throw new ValidationError('Giới tính không hợp lệ.');
    }
  }
}
