import type { Identity } from "../../domain/entities/identity.js";
import type { SanctionsMatch } from "../../domain/entities/sanctions-match.js";
import type { VerificationSession } from "../../domain/entities/verification-session.js";
import type { VerificationStatus } from "../../domain/services/state-machine.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

/**
 * VerificationRepositoryPort — CRUD for Identity, VerificationSession,
 * SanctionsMatch. Implementations use PostgreSQL with row-level encryption
 * for PII columns.
 *
 * All methods MUST be idempotent for same-input re-plays (webhooks).
 */

export interface ListSessionsFilter {
  readonly subjectId: UUID;
  readonly status?: VerificationStatus;
  readonly from?: ISODateTime;
  readonly to?: ISODateTime;
  readonly limit?: number;
}

export interface ListMatchesFilter {
  readonly subjectId: UUID;
  readonly status?: "PENDING" | "CONFIRMED_MATCH" | "FALSE_POSITIVE";
  readonly limit?: number;
}

export interface VerificationRepositoryPort {
  saveIdentity(identity: Identity): Promise<void>;
  getIdentity(id: UUID): Promise<Identity | null>;

  saveSession(session: VerificationSession): Promise<void>;
  getSession(id: UUID): Promise<VerificationSession | null>;
  /** Used by webhook handlers to find the session a provider is calling back about. */
  getSessionByProviderRef(providerRef: string): Promise<VerificationSession | null>;

  listSessionsBySubject(filter: ListSessionsFilter): Promise<readonly VerificationSession[]>;

  saveMatch(match: SanctionsMatch): Promise<void>;
  listMatchesBySubject(filter: ListMatchesFilter): Promise<readonly SanctionsMatch[]>;
}
