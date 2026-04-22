import { Identity } from "../../domain/entities/identity.js";
import { VerificationSession } from "../../domain/entities/verification-session.js";
import type { DocumentRef } from "../../domain/value-objects/document-ref.js";
import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { Jurisdiction } from "../../domain/value-objects/jurisdiction.js";
import type { PIIString } from "../../domain/value-objects/pii-string.js";
import type { TaxId } from "../../domain/value-objects/tax-id.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

import { ConsentRequired, ProviderError } from "../errors.js";
import type { AuditLogPort } from "../ports/audit-log-port.js";
import type { ClockPort } from "../ports/clock-port.js";
import type { EventBusPort } from "../ports/event-bus-port.js";
import type { IdempotencyPort } from "../ports/idempotency-port.js";
import type {
  IdentityVerificationPort,
  VerificationKind,
} from "../ports/identity-verification-port.js";
import type { VerificationRepositoryPort } from "../ports/verification-repository-port.js";

/**
 * StartVerification — begins a KYC/KYB flow.
 *
 * Behavior (per plan Task 19):
 *  1. Load identity (by id) or create a new one using the provided PII.
 *  2. Require explicit consent for the verification kind — reject with
 *     `ConsentRequired` if missing.
 *  3. Create a VerificationSession in INITIATED state.
 *  4. Call IdentityVerificationPort.startVerification → transitions to PENDING.
 *  5. On provider failure: session stays INITIATED, an audit
 *     `VerificationFailed` event is appended, error re-thrown as ProviderError.
 *  6. Idempotency: repeated calls with the same idempotencyKey return the
 *     same sessionId + hostedFlowUrl.
 *
 * Security:
 *  - `fullName` + `taxId` arrive as PII types; raw values never enter logs.
 *  - Audit events carry only subject/session IDs, not PII values.
 */

export interface StartVerificationInput {
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly identityId?: UUID;
  readonly fullName: PIIString;
  readonly taxId?: TaxId;
  readonly dateOfBirth?: ISODateTime;
  readonly country: Jurisdiction;
  readonly documents?: readonly DocumentRef[];
  readonly kind: VerificationKind;
  readonly consentGranted: boolean;
  readonly newSessionId: UUID;
  readonly newIdentityId?: UUID;
  readonly templateId?: string;
  readonly returnUrl?: string;
}

export interface StartVerificationOutput {
  readonly sessionId: UUID;
  readonly identityId: UUID;
  readonly providerSessionId: string;
  readonly hostedFlowUrl: string | undefined;
}

export interface StartVerificationDeps {
  readonly clock: ClockPort;
  readonly idempotency: IdempotencyPort;
  readonly identityVerification: IdentityVerificationPort;
  readonly repository: VerificationRepositoryPort;
  readonly auditLog: AuditLogPort;
  readonly eventBus: EventBusPort;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export class StartVerification {
  constructor(private readonly deps: StartVerificationDeps) {}

  async execute(input: StartVerificationInput): Promise<StartVerificationOutput> {
    const key = `${input.tenantId}:StartVerification:${input.idempotencyKey}`;
    return this.deps.idempotency.run(key, IDEMPOTENCY_TTL_MS, () => this.runOnce(input));
  }

  private async runOnce(input: StartVerificationInput): Promise<StartVerificationOutput> {
    if (!input.consentGranted) {
      throw new ConsentRequired();
    }

    const now = ISODateTime.fromDate(this.deps.clock.now());
    const identity = await this.loadOrCreateIdentity(input, now);
    const session = VerificationSession.create({
      id: input.newSessionId,
      identityId: identity.props.id,
      provider: "PERSONA",
      jurisdiction: input.country,
      startedAt: now,
    });
    await this.deps.repository.saveSession(session);

    let providerOut: { providerSessionId: string; hostedFlowUrl: string | undefined };
    try {
      const out = await this.deps.identityVerification.startVerification({
        subjectId: identity.props.id,
        subjectKind: "IDENTITY",
        fullName: input.fullName,
        kind: input.kind,
        ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
        ...(input.returnUrl !== undefined ? { returnUrl: input.returnUrl } : {}),
      });
      providerOut = { providerSessionId: out.providerSessionId, hostedFlowUrl: out.hostedFlowUrl };
    } catch (cause) {
      await this.deps.auditLog.append({
        eventType: "VerificationFailed",
        actorKey: `tenant:${input.tenantId}`,
        subjectKey: `session:${session.id}`,
        payload: { reason: "provider_error" },
        occurredAt: now,
      });
      throw new ProviderError("PERSONA", cause);
    }

    const pending = session.markPending(providerOut.providerSessionId);
    await this.deps.repository.saveSession(pending);

    await this.deps.auditLog.append({
      eventType: "VerificationStarted",
      actorKey: `tenant:${input.tenantId}`,
      subjectKey: `session:${session.id}`,
      payload: { kind: input.kind, provider: "PERSONA" },
      occurredAt: now,
    });

    await this.deps.eventBus.publish({
      eventType: "VerificationStarted",
      aggregateId: session.id,
      occurredAt: now,
      payload: { kind: input.kind, provider: "PERSONA" },
    });

    return {
      sessionId: session.id,
      identityId: identity.props.id,
      providerSessionId: providerOut.providerSessionId,
      hostedFlowUrl: providerOut.hostedFlowUrl,
    };
  }

  private async loadOrCreateIdentity(
    input: StartVerificationInput,
    now: ISODateTime,
  ): Promise<Identity> {
    if (input.identityId !== undefined) {
      const existing = await this.deps.repository.getIdentity(input.identityId);
      if (existing) return existing;
    }
    const idToUse = input.identityId ?? input.newIdentityId;
    if (idToUse === undefined) {
      throw new Error("newIdentityId required when identityId is not provided");
    }
    const created = Identity.create({
      id: idToUse,
      fullName: input.fullName,
      country: input.country,
      createdAt: now,
      ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      ...(input.documents !== undefined ? { documents: input.documents } : {}),
    });
    await this.deps.repository.saveIdentity(created);
    return created;
  }
}
