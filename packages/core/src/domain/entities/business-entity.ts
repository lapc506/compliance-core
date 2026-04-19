// NOTE: Fase 1 skeleton only. Full KYB support lands in Fase 2.
// Exists so proto messages compile and the shape is established.

import { UBOPercentageExceedsLimit } from "../errors.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { Jurisdiction } from "../value-objects/jurisdiction.js";
import type { TaxId } from "../value-objects/tax-id.js";
import type { UUID } from "../value-objects/uuid.js";

export interface UBO {
  readonly identityId: UUID;
  readonly ownershipPercent: number;
  readonly role: "SHAREHOLDER" | "DIRECTOR" | "BENEFICIAL_OWNER";
}

export interface BusinessEntityProps {
  readonly id: UUID;
  readonly legalName: string;
  readonly registrationId: TaxId;
  readonly country: Jurisdiction;
  readonly formationDate: ISODateTime;
  readonly industry: string | undefined;
  readonly ubos: readonly UBO[];
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export class BusinessEntity {
  private constructor(public readonly props: BusinessEntityProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(input: {
    id: UUID;
    legalName: string;
    registrationId: TaxId;
    country: Jurisdiction;
    formationDate: ISODateTime;
    industry?: string;
    ubos?: readonly UBO[];
    createdAt: ISODateTime;
  }): BusinessEntity {
    return new BusinessEntity({
      id: input.id,
      legalName: input.legalName,
      registrationId: input.registrationId,
      country: input.country,
      formationDate: input.formationDate,
      industry: input.industry,
      ubos: input.ubos ?? [],
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
  }

  addUBO(ubo: UBO, now: ISODateTime): BusinessEntity {
    const next = [...this.props.ubos, ubo];
    const total = next.reduce((sum, u) => sum + u.ownershipPercent, 0);
    if (total > 100)
      throw new UBOPercentageExceedsLimit(`UBO ownership total ${total}% exceeds 100`);
    return new BusinessEntity({ ...this.props, ubos: next, updatedAt: now });
  }
}
