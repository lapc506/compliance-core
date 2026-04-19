import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { ComplianceEvent } from "./compliance-event.js";

/**
 * Persistence wrapper for a ComplianceEvent. Adds infra-level metadata
 * (when + who persisted it). The event itself owns the hash chain invariants.
 */
export interface AuditEntry {
  readonly event: ComplianceEvent;
  readonly createdAt: ISODateTime;
  readonly persistedBy: string; // service identity, not end-user
}
