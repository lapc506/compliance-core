// Public re-exports — consumers import from "@compliance-core/core/domain"

// Value objects
export { UUID } from "./value-objects/uuid.js";
export { Hex32 } from "./value-objects/hex32.js";
export { ISODateTime } from "./value-objects/iso-datetime.js";
export { Jurisdiction, JURISDICTIONS } from "./value-objects/jurisdiction.js";
export { Decimal } from "./value-objects/decimal.js";
export { PIIString } from "./value-objects/pii-string.js";
export { TaxId, type TaxIdKind, type TaxIdInput } from "./value-objects/tax-id.js";
export {
  DocumentRef,
  type DocumentKind,
  type DocumentRefData,
} from "./value-objects/document-ref.js";

// Entities
export { Identity, type IdentityProps, type IdentityCreateInput } from "./entities/identity.js";
export { BusinessEntity, type BusinessEntityProps, type UBO } from "./entities/business-entity.js";
export {
  VerificationSession,
  type VerificationSessionProps,
  type VerificationProvider,
  type VerificationDecision,
} from "./entities/verification-session.js";
export {
  SanctionsMatch,
  type SanctionsMatchProps,
  type SanctionsList,
  type ReviewStatus,
} from "./entities/sanctions-match.js";
export { ComplianceEvent, type ComplianceEventProps } from "./entities/compliance-event.js";
export type { AuditEntry } from "./entities/audit-entry.js";

// Services
export { AuditChainService } from "./services/audit-chain-service.js";
export type {
  AuditEventInput,
  SealedAuditEvent,
  VerificationResult,
} from "./services/audit-chain-service.js";
export { canonicalJson } from "./services/canonical-json.js";
export { sha256Hex } from "./services/sha256.js";
export { VerificationStateMachine, type VerificationStatus } from "./services/state-machine.js";

// Events
export * from "./events/index.js";

// Errors
export * from "./errors.js";
