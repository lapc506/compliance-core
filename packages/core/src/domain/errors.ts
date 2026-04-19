/**
 * Typed domain errors — every throw in compliance-core domain uses one of these.
 * Never include PII in error messages. Use correlation IDs only.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidUuid extends DomainError {
  constructor(msg = "Invalid UUID") {
    super(msg);
  }
}
export class InvalidHex32 extends DomainError {
  constructor(msg = "Invalid Hex32") {
    super(msg);
  }
}
export class InvalidISODateTime extends DomainError {
  constructor(msg = "Invalid ISODateTime") {
    super(msg);
  }
}
export class InvalidJurisdiction extends DomainError {
  constructor(msg = "Invalid Jurisdiction") {
    super(msg);
  }
}
export class InvalidDecimal extends DomainError {
  constructor(msg = "Invalid Decimal") {
    super(msg);
  }
}
export class InvalidTaxId extends DomainError {
  constructor(msg = "Invalid TaxId") {
    super(msg);
  }
}
export class InvalidVerificationStateTransition extends DomainError {
  constructor(from: string, to: string) {
    super(`Invalid verification state transition: ${from} → ${to}`);
  }
}
export class AlreadyReviewed extends DomainError {
  constructor(msg = "SanctionsMatch has already been reviewed") {
    super(msg);
  }
}
export class HashMismatch extends DomainError {
  constructor(seqNumber: bigint, stored: string, recomputed: string) {
    super(
      `Audit hash mismatch at seq=${seqNumber}: stored=${stored.slice(0, 8)}… recomputed=${recomputed.slice(0, 8)}…`,
    );
  }
}
export class AuditChainBroken extends DomainError {
  public readonly brokenAt: bigint;
  public readonly reason: "hash-mismatch" | "seq-gap" | "prev-hash-mismatch";
  constructor(brokenAt: bigint, reason: "hash-mismatch" | "seq-gap" | "prev-hash-mismatch") {
    super(`Audit chain broken at seq=${brokenAt}: ${reason}`);
    this.brokenAt = brokenAt;
    this.reason = reason;
  }
}
export class UBOPercentageExceedsLimit extends DomainError {
  constructor(msg = "UBO ownership total exceeds 100%") {
    super(msg);
  }
}
export class InvalidConfidence extends DomainError {
  constructor(msg = "confidence must be in [0,100]") {
    super(msg);
  }
}
export class PayloadContainsRawPII extends DomainError {
  constructor(msg = "payload contains raw PII — redact before persisting") {
    super(msg);
  }
}
