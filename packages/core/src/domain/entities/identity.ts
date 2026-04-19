import type { DocumentRef } from "../value-objects/document-ref.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { Jurisdiction } from "../value-objects/jurisdiction.js";
import { PIIString } from "../value-objects/pii-string.js";
import type { TaxId } from "../value-objects/tax-id.js";
import type { UUID } from "../value-objects/uuid.js";

export interface IdentityProps {
  readonly id: UUID;
  readonly taxId: TaxId | undefined;
  readonly fullName: PIIString;
  readonly dateOfBirth: ISODateTime | undefined;
  readonly country: Jurisdiction;
  readonly documents: readonly DocumentRef[];
  readonly verificationSessionIds: readonly UUID[];
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export interface IdentityCreateInput {
  id: UUID;
  taxId?: TaxId;
  fullName: string | PIIString;
  dateOfBirth?: ISODateTime;
  country: Jurisdiction;
  documents?: readonly DocumentRef[];
  createdAt: ISODateTime;
}

/**
 * Identity aggregate root. All mutators return new instances.
 * `fullName` is PII — wrapped as PIIString so serializers never leak.
 */
export class Identity {
  private constructor(public readonly props: IdentityProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(input: IdentityCreateInput): Identity {
    const fullName =
      input.fullName instanceof PIIString ? input.fullName : PIIString.from(input.fullName);
    if (input.dateOfBirth && new Date(input.dateOfBirth).getTime() > Date.now()) {
      throw new Error("dateOfBirth cannot be in the future");
    }
    return new Identity({
      id: input.id,
      taxId: input.taxId ?? undefined,
      fullName,
      dateOfBirth: input.dateOfBirth ?? undefined,
      country: input.country,
      documents: input.documents ?? [],
      verificationSessionIds: [],
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
  }

  withDocument(doc: DocumentRef, now: ISODateTime): Identity {
    return new Identity({
      ...this.props,
      documents: [...this.props.documents, doc],
      updatedAt: now,
    });
  }

  withVerification(sessionId: UUID, now: ISODateTime): Identity {
    return new Identity({
      ...this.props,
      verificationSessionIds: [...this.props.verificationSessionIds, sessionId],
      updatedAt: now,
    });
  }

  toJSON(): object {
    return {
      id: this.props.id,
      taxId: this.props.taxId?.toJSON(),
      fullName: this.props.fullName.toJSON(),
      dateOfBirth: this.props.dateOfBirth,
      country: this.props.country,
      documents: this.props.documents.map((d) => d.toJSON()),
      verificationSessionIds: this.props.verificationSessionIds,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
