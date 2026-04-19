import type { ISODateTime } from "./iso-datetime.js";
import type { Jurisdiction } from "./jurisdiction.js";
import { PIIString } from "./pii-string.js";
import type { UUID } from "./uuid.js";

export type DocumentKind =
  | "PASSPORT"
  | "NATIONAL_ID"
  | "DRIVING_LICENSE"
  | "RESIDENCE_PERMIT"
  | "UTILITY_BILL"
  | "BUSINESS_REGISTRATION";

export interface DocumentRefData {
  kind: DocumentKind;
  number: string;
  issuedBy: Jurisdiction;
  issuedAt: ISODateTime;
  expiresAt?: ISODateTime;
  evidenceBlobId?: UUID;
}

/**
 * Safe envelope for an ID document reference. The `number` is stored as PIIString —
 * logs, JSON, util.inspect and toString all redact it by default.
 */
export class DocumentRef {
  private readonly _number: PIIString;

  private constructor(
    public readonly kind: DocumentKind,
    number: string,
    public readonly issuedBy: Jurisdiction,
    public readonly issuedAt: ISODateTime,
    public readonly expiresAt: ISODateTime | undefined,
    public readonly evidenceBlobId: UUID | undefined,
  ) {
    this._number = PIIString.from(number);
  }

  static create(data: DocumentRefData): DocumentRef {
    return new DocumentRef(
      data.kind,
      data.number,
      data.issuedBy,
      data.issuedAt,
      data.expiresAt ?? undefined,
      data.evidenceBlobId ?? undefined,
    );
  }

  unsafeRevealNumber(): string {
    return this._number.unsafeReveal();
  }

  redactedNumber(): string {
    return this._number.redactedTail(4);
  }

  toJSON(): object {
    return {
      kind: this.kind,
      number: this._number.toJSON(),
      issuedBy: this.issuedBy,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      evidenceBlobId: this.evidenceBlobId,
    };
  }
}
