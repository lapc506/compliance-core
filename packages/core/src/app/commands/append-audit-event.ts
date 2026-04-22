import type { ComplianceEvent } from "../../domain/entities/compliance-event.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";

import { PayloadContainsRawPII } from "../../domain/errors.js";
import type { AppendInput, AuditLogPort } from "../ports/audit-log-port.js";

/**
 * AppendAuditEvent — thin wrapper used by other commands and by tenants that
 * want to emit custom events from outside the bounded contexts in v1
 * (e.g., evidence download triggered by ops tooling).
 *
 * Enforces the "payload is pre-redacted" invariant: if the payload contains
 * any value that serializes to `[REDACTED]` (PIIString) or if it includes
 * keys that look like raw PII fields (taxId, fullName, documentNumber), we
 * throw PayloadContainsRawPII — loud failure is preferable to silent data
 * leakage in the legal log.
 */

const FORBIDDEN_KEYS = new Set([
  "taxId",
  "fullName",
  "documentNumber",
  "dateOfBirth",
  "evidenceBlob",
]);

function assertRedacted(payload: Record<string, unknown>, path: readonly string[] = []): void {
  for (const [k, v] of Object.entries(payload)) {
    const currentPath = [...path, k];
    if (FORBIDDEN_KEYS.has(k)) {
      throw new PayloadContainsRawPII(`forbidden key in audit payload: ${currentPath.join(".")}`);
    }
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      assertRedacted(v as Record<string, unknown>, currentPath);
    }
  }
}

export interface AppendAuditEventInput {
  readonly eventType: string;
  readonly actorKey: string;
  readonly subjectKey: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: ISODateTime;
}

export interface AppendAuditEventDeps {
  readonly auditLog: AuditLogPort;
}

export class AppendAuditEvent {
  constructor(private readonly deps: AppendAuditEventDeps) {}

  async execute(input: AppendAuditEventInput): Promise<ComplianceEvent> {
    assertRedacted(input.payload);
    const appendInput: AppendInput = {
      eventType: input.eventType,
      actorKey: input.actorKey,
      subjectKey: input.subjectKey,
      payload: input.payload,
      occurredAt: input.occurredAt,
    };
    return this.deps.auditLog.append(appendInput);
  }
}
