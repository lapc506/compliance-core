import { AlreadyReviewed, InvalidConfidence } from "../errors.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { UUID } from "../value-objects/uuid.js";

export type SanctionsList = "OFAC_SDN" | "UN" | "EU" | "PEP" | "ADVERSE_MEDIA";
export type ReviewStatus = "PENDING" | "CONFIRMED_MATCH" | "FALSE_POSITIVE";

export interface SanctionsMatchProps {
  readonly id: UUID;
  readonly identityId: UUID;
  readonly list: SanctionsList;
  readonly listEntryId: string;
  readonly confidence: number;
  readonly matchedName: string;
  readonly matchedAliases: readonly string[];
  readonly reviewStatus: ReviewStatus;
  readonly reviewedBy: string | undefined;
  readonly reviewedAt: ISODateTime | undefined;
  readonly reviewNotes: string | undefined;
  readonly detectedAt: ISODateTime;
}

export class SanctionsMatch {
  private constructor(public readonly props: SanctionsMatchProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(input: {
    id: UUID;
    identityId: UUID;
    list: SanctionsList;
    listEntryId: string;
    confidence: number;
    matchedName: string;
    matchedAliases?: readonly string[];
    reviewStatus?: ReviewStatus;
    detectedAt: ISODateTime;
  }): SanctionsMatch {
    if (input.confidence < 0 || input.confidence > 100) {
      throw new InvalidConfidence(`confidence must be [0,100], got ${input.confidence}`);
    }
    return new SanctionsMatch({
      id: input.id,
      identityId: input.identityId,
      list: input.list,
      listEntryId: input.listEntryId,
      confidence: input.confidence,
      matchedName: input.matchedName,
      matchedAliases: input.matchedAliases ?? [],
      reviewStatus: input.reviewStatus ?? "PENDING",
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined,
      detectedAt: input.detectedAt,
    });
  }

  confirm(reviewer: string, at: ISODateTime, notes?: string): SanctionsMatch {
    if (this.props.reviewStatus !== "PENDING") throw new AlreadyReviewed();
    const base: SanctionsMatchProps = {
      ...this.props,
      reviewStatus: "CONFIRMED_MATCH",
      reviewedBy: reviewer,
      reviewedAt: at,
    };
    return new SanctionsMatch(notes !== undefined ? { ...base, reviewNotes: notes } : base);
  }

  markFalsePositive(reviewer: string, at: ISODateTime, notes?: string): SanctionsMatch {
    if (this.props.reviewStatus !== "PENDING") throw new AlreadyReviewed();
    const base: SanctionsMatchProps = {
      ...this.props,
      reviewStatus: "FALSE_POSITIVE",
      reviewedBy: reviewer,
      reviewedAt: at,
    };
    return new SanctionsMatch(notes !== undefined ? { ...base, reviewNotes: notes } : base);
  }
}
