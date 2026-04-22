import type { VerificationSession } from "../../domain/entities/verification-session.js";
import type { PIIString } from "../../domain/value-objects/pii-string.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

/**
 * IdentityVerificationPort — outbound abstraction over KYC providers
 * (Persona, Ondato, Incode, …).
 *
 * All PII-bearing inputs MUST use `PIIString` wrapper; adapters handle the
 * `unsafeReveal()` boundary crossing.
 */

export type VerificationKind =
  | "KYC_DOCUMENT"
  | "KYC_LIVENESS"
  | "KYC_FACE_MATCH"
  | "KYB_REGISTRATION"
  | "KYB_UBO"
  | "AGE"
  | "PROOF_OF_ADDRESS"
  | "PROOF_OF_PERSONHOOD";

export type SubjectKind = "IDENTITY" | "BUSINESS";

export interface StartVerificationInput {
  readonly subjectId: UUID;
  readonly subjectKind: SubjectKind;
  readonly fullName: PIIString;
  readonly kind: VerificationKind;
  readonly templateId?: string;
  readonly returnUrl?: string;
}

export interface StartVerificationOutput {
  readonly providerSessionId: string;
  readonly hostedFlowUrl: string | undefined;
  readonly expiresAt: string;
}

/** Opaque blob reference; actual bytes live in the evidence store. */
export interface EvidenceBundle {
  readonly sessionId: UUID;
  readonly documents: ReadonlyArray<{ kind: string; storageRef: string; sha256: string }>;
  readonly selfie?: { storageRef: string; sha256: string };
  readonly livenessScore?: number;
  readonly faceMatchScore?: number;
}

/**
 * `quickCheck(receiverId)` — stubbed out in v1 (see spec §7.1). Returns a
 * deterministic shape so callers can wire the UX without the backend.
 */
export interface QuickCheckResult {
  readonly receiverId: string;
  readonly signal: "UNKNOWN" | "LIKELY_REAL" | "LIKELY_FAKE";
  readonly checkedAt: string;
}

export interface IdentityVerificationPort {
  startVerification(input: StartVerificationInput): Promise<StartVerificationOutput>;
  getSessionStatus(sessionId: UUID): Promise<VerificationSession>;
  fetchEvidence(sessionId: UUID): Promise<EvidenceBundle>;
  /** v1 stub — returns `UNKNOWN` until a provider is wired. */
  quickCheck(receiverId: string): Promise<QuickCheckResult>;
}
