import type { SanctionsMatch } from "../../domain/entities/sanctions-match.js";
import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { PIIString } from "../../domain/value-objects/pii-string.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

import { NotFound } from "../errors.js";
import type { AuditLogPort } from "../ports/audit-log-port.js";
import type { ClockPort } from "../ports/clock-port.js";
import type { EventBusPort } from "../ports/event-bus-port.js";
import type {
  SanctionsScreeningPort,
  ScreeningSubject,
} from "../ports/sanctions-screening-port.js";
import type { VerificationRepositoryPort } from "../ports/verification-repository-port.js";

/**
 * ScreenSanctions — runs a single subject through the sanctions screening
 * port, persists matches above the confidence threshold, appends audit
 * events, and publishes SanctionsMatchFound events.
 *
 * Default threshold: 80 (spec §7.6). Callers may override per-tenant.
 */

export interface ScreenSanctionsInput {
  readonly tenantId: string;
  readonly subjectId: UUID;
  readonly subjectKind: "IDENTITY" | "BUSINESS";
  readonly subjectName: PIIString;
  readonly subjectCountry: string;
  readonly subjectDateOfBirth?: ISODateTime;
  readonly confidenceThreshold?: number;
}

export interface ScreenSanctionsOutput {
  readonly subjectId: UUID;
  readonly totalCandidates: number;
  readonly persistedMatches: number;
  readonly matchIds: readonly UUID[];
}

export interface ScreenSanctionsDeps {
  readonly clock: ClockPort;
  readonly sanctions: SanctionsScreeningPort;
  readonly repository: VerificationRepositoryPort;
  readonly auditLog: AuditLogPort;
  readonly eventBus: EventBusPort;
}

const DEFAULT_THRESHOLD = 80;

export class ScreenSanctions {
  constructor(private readonly deps: ScreenSanctionsDeps) {}

  async execute(input: ScreenSanctionsInput): Promise<ScreenSanctionsOutput> {
    if (input.subjectKind === "IDENTITY") {
      const identity = await this.deps.repository.getIdentity(input.subjectId);
      if (!identity) throw new NotFound("Identity", input.subjectId);
    }
    // BusinessEntity repo lookup lands in Fase 2; contract for this task
    // allows running against identities.

    const subject: ScreeningSubject =
      input.subjectKind === "IDENTITY"
        ? {
            kind: "IDENTITY",
            id: input.subjectId,
            fullName: input.subjectName,
            country: input.subjectCountry,
            ...(input.subjectDateOfBirth !== undefined
              ? { dateOfBirth: input.subjectDateOfBirth }
              : {}),
          }
        : {
            kind: "BUSINESS",
            id: input.subjectId,
            legalName: input.subjectName,
            country: input.subjectCountry,
          };

    const candidates = await this.deps.sanctions.screen(subject);
    const threshold = input.confidenceThreshold ?? DEFAULT_THRESHOLD;
    const keep: SanctionsMatch[] = candidates.filter((m) => m.props.confidence >= threshold);

    const now = ISODateTime.fromDate(this.deps.clock.now());
    const matchIds: UUID[] = [];
    for (const m of keep) {
      await this.deps.repository.saveMatch(m);
      matchIds.push(m.props.id);
      await this.deps.auditLog.append({
        eventType: "SanctionsMatchFound",
        actorKey: `tenant:${input.tenantId}`,
        subjectKey: `match:${m.props.id}`,
        payload: {
          subjectId: input.subjectId,
          list: m.props.list,
          listEntryId: m.props.listEntryId,
          confidence: m.props.confidence,
        },
        occurredAt: now,
      });
      await this.deps.eventBus.publish({
        eventType: "SanctionsMatchFound",
        aggregateId: m.props.id,
        occurredAt: now,
        payload: {
          subjectId: input.subjectId,
          list: m.props.list,
          listEntryId: m.props.listEntryId,
          confidence: m.props.confidence,
        },
      });
    }

    return {
      subjectId: input.subjectId,
      totalCandidates: candidates.length,
      persistedMatches: keep.length,
      matchIds,
    };
  }
}
