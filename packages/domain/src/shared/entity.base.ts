import { DomainEvent } from './domain-event';

export abstract class Entity<TId = string> {
  protected readonly _id: TId;
  private _domainEvents: DomainEvent[] = [];

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  public equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
