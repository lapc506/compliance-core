import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { UUID } from "../value-objects/uuid.js";

/**
 * Frozen domain events — published after successful state transitions.
 * Payloads are redacted; never carry raw PII.
 */

export interface DomainEventBase {
  readonly eventType: string;
  readonly occurredAt: ISODateTime;
  readonly aggregateId: UUID;
  readonly payload: Record<string, unknown>;
}

export interface VerificationStarted extends DomainEventBase {
  readonly eventType: "VerificationStarted";
}
export interface VerificationCompleted extends DomainEventBase {
  readonly eventType: "VerificationCompleted";
}
export interface VerificationFailed extends DomainEventBase {
  readonly eventType: "VerificationFailed";
}
export interface SanctionsMatchFound extends DomainEventBase {
  readonly eventType: "SanctionsMatchFound";
}
export interface AuditIntegrityBroken extends DomainEventBase {
  readonly eventType: "AuditIntegrityBroken";
}
export interface ListRefreshed extends DomainEventBase {
  readonly eventType: "ListRefreshed";
}

export type DomainEvent =
  | VerificationStarted
  | VerificationCompleted
  | VerificationFailed
  | SanctionsMatchFound
  | AuditIntegrityBroken
  | ListRefreshed;

export function freezeEvent<T extends DomainEvent>(e: T): T {
  const frozen = { ...e, payload: Object.freeze({ ...e.payload }) };
  return Object.freeze(frozen) as unknown as T;
}
