import type { SanctionsList, SanctionsMatch } from "../../domain/entities/sanctions-match.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { PIIString } from "../../domain/value-objects/pii-string.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

/**
 * Input to `screen()` — either an Identity or a BusinessEntity projection.
 * Names are PIIString to prevent accidental logging.
 */
export type ScreeningSubject =
  | {
      readonly kind: "IDENTITY";
      readonly id: UUID;
      readonly fullName: PIIString;
      readonly dateOfBirth?: ISODateTime;
      readonly country: string;
    }
  | {
      readonly kind: "BUSINESS";
      readonly id: UUID;
      readonly legalName: PIIString;
      readonly country: string;
    };

export type MatchResolution =
  | { kind: "CONFIRMED_MATCH"; reviewer: string; notes?: string }
  | { kind: "FALSE_POSITIVE"; reviewer: string; notes?: string };

export interface RefreshReport {
  readonly source: SanctionsList;
  readonly fetchedAt: ISODateTime;
  readonly entriesAdded: number;
  readonly entriesRemoved: number;
  readonly entriesUpdated: number;
}

/**
 * SanctionsScreeningPort — outbound abstraction over OFAC/UN/EU feed adapters
 * + enriched providers (SnapCompliance, OpenSanctions).
 */
export interface SanctionsScreeningPort {
  /**
   * Screen a subject against the configured lists. MUST return ALL matches
   * above the configured confidence threshold (not just the best).
   */
  screen(subject: ScreeningSubject): Promise<readonly SanctionsMatch[]>;

  /** Re-download and re-index a specific list source. */
  refreshLists(source: SanctionsList): Promise<RefreshReport>;

  /** Lookup a single match by id (for review UI). */
  getMatch(id: UUID): Promise<SanctionsMatch | null>;

  /** Mark a match as CONFIRMED_MATCH or FALSE_POSITIVE. */
  resolveMatch(id: UUID, resolution: MatchResolution): Promise<SanctionsMatch>;
}
