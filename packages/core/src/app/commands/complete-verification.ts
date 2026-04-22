import type { VerificationSession } from "../../domain/entities/verification-session.js";
import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

import { UnknownProviderSession } from "../errors.js";
import type { AuditLogPort } from "../ports/audit-log-port.js";
import type { ClockPort } from "../ports/clock-port.js";
import type { EventBusPort } from "../ports/event-bus-port.js";
import type { IdempotencyPort } from "../ports/idempotency-port.js";
import type { VerificationRepositoryPort } from "../ports/verification-repository-port.js";

/**
 * CompleteVerification — invoked from webhook handlers when the provider
 * finishes a session (Persona `inquiry.completed` / `inquiry.failed`).
 *
 * Behavior (per plan Task 19):
 *  1. Locate session by providerSessionId.
 *  2. Apply provider verdict (PASS → VERIFIED, FAIL → FAILED,
 *     MANUAL_REVIEW → FAILED with audit flag).
 *  3. Persist updated session.
 *  4. Append audit event (VerificationCompleted or VerificationFailed).
 *  5. Publish domain event.
 *  6. Idempotent: replayed webhooks produce no duplicate events (detected via
 *     both IdempotencyPort + session already-terminal check).
 */

export type ProviderVerdict = "PASS" | "FAIL" | "MANUAL_REVIEW";

export interface CompleteVerificationInput {
  readonly tenantId: string;
  readonly providerSessionId: string;
  readonly verdict: ProviderVerdict;
  readonly reasons: readonly string[];
  readonly providerScore?: number;
  readonly webhookDeliveryId: string;
}

export interface CompleteVerificationOutput {
  readonly sessionId: UUID;
  readonly finalStatus: "VERIFIED" | "FAILED";
  readonly alreadyApplied: boolean;
}

export interface CompleteVerificationDeps {
  readonly clock: ClockPort;
  readonly idempotency: IdempotencyPort;
  readonly repository: VerificationRepositoryPort;
  readonly auditLog: AuditLogPort;
  readonly eventBus: EventBusPort;
}

const WEBHOOK_IDEMPOTENCY_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export class CompleteVerification {
  constructor(private readonly deps: CompleteVerificationDeps) {}

  async execute(input: CompleteVerificationInput): Promise<CompleteVerificationOutput> {
    const key = `${input.tenantId}:CompleteVerification:${input.webhookDeliveryId}`;
    return this.deps.idempotency.run(key, WEBHOOK_IDEMPOTENCY_TTL_MS, () => this.runOnce(input));
  }

  private async runOnce(input: CompleteVerificationInput): Promise<CompleteVerificationOutput> {
    const session = await this.deps.repository.getSessionByProviderRef(input.providerSessionId);
    if (!session) throw new UnknownProviderSession(input.providerSessionId);

    if (isTerminal(session)) {
      return {
        sessionId: session.id,
        finalStatus: session.status === "VERIFIED" ? "VERIFIED" : "FAILED",
        alreadyApplied: true,
      };
    }

    const now = ISODateTime.fromDate(this.deps.clock.now());
    const decision = input.verdict === "PASS" ? "PASS" : "FAIL";
    const updated = session.markCompleted(decision, now, input.providerSessionId);
    await this.deps.repository.saveSession(updated);

    const eventType = decision === "PASS" ? "VerificationCompleted" : "VerificationFailed";
    await this.deps.auditLog.append({
      eventType,
      actorKey: `provider:${session.props.provider}`,
      subjectKey: `session:${session.id}`,
      payload: { verdict: input.verdict, reasons: [...input.reasons] },
      occurredAt: now,
    });

    await this.deps.eventBus.publish({
      eventType,
      aggregateId: session.id,
      occurredAt: now,
      payload: { verdict: input.verdict, reasons: [...input.reasons] },
    });

    return {
      sessionId: session.id,
      finalStatus: decision === "PASS" ? "VERIFIED" : "FAILED",
      alreadyApplied: false,
    };
  }
}

function isTerminal(s: VerificationSession): boolean {
  return s.status === "VERIFIED" || s.status === "FAILED" || s.status === "EXPIRED";
}
