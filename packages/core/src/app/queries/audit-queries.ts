import type { ComplianceEvent } from "../../domain/entities/compliance-event.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";

import type { AuditLogPort, IntegrityReport, Period } from "../ports/audit-log-port.js";

/**
 * VerifyAuditIntegrity — recomputes the SHA-256 hash chain across [from, to].
 * Used by the daily cron + pre-export safety net. Returns the first break
 * point (or ok).
 */

export interface VerifyAuditIntegrityInput {
  readonly fromSeq: bigint;
  readonly toSeq: bigint;
}

export interface VerifyAuditIntegrityDeps {
  readonly auditLog: AuditLogPort;
}

export class VerifyAuditIntegrity {
  constructor(private readonly deps: VerifyAuditIntegrityDeps) {}
  async execute(input: VerifyAuditIntegrityInput): Promise<IntegrityReport> {
    if (input.fromSeq > input.toSeq) {
      throw new Error("fromSeq must be <= toSeq");
    }
    return this.deps.auditLog.verify(input.fromSeq, input.toSeq);
  }
}

/**
 * ExportAuditLog — streams ComplianceEvents in a time period. Caller is
 * expected to run VerifyAuditIntegrity immediately before exporting so the
 * bundle is legally defensible.
 */

export interface ExportAuditLogInput {
  readonly from: ISODateTime;
  readonly to: ISODateTime;
}

export interface ExportAuditLogDeps {
  readonly auditLog: AuditLogPort;
}

export class ExportAuditLog {
  constructor(private readonly deps: ExportAuditLogDeps) {}
  execute(input: ExportAuditLogInput): AsyncIterable<ComplianceEvent> {
    const period: Period = { from: input.from, to: input.to };
    return this.deps.auditLog.export(period);
  }
}
