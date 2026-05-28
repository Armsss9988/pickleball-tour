export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}

export function createDomainEvent(
  eventName: string,
  payload: Record<string, unknown> = {},
): DomainEvent {
  return {
    eventName,
    occurredAt: new Date(),
    payload,
  };
}
