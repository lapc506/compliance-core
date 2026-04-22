/**
 * Application-layer errors. Domain errors live in src/domain/errors.ts.
 * These are thrown by command handlers, never inside domain entities.
 *
 * No PII may appear in any message. Use session / correlation IDs only.
 */

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Consent required but not recorded (GDPR / Ley 7764). Thrown by
 * StartVerification when the subject has not granted the specific consent
 * category required for the verification kind.
 */
export class ConsentRequired extends ApplicationError {
  constructor(msg = "Subject consent required for this verification") {
    super(msg);
  }
}

/**
 * Provider call failed (network, HTTP 5xx, rate limit exhausted, invalid
 * credentials). Adapters SHOULD wrap native errors in ProviderError so
 * commands can decide session-state handling uniformly.
 */
export class ProviderError extends ApplicationError {
  public readonly providerCode: string;
  public override readonly cause: unknown;
  constructor(providerCode: string, cause: unknown, msg?: string) {
    super(msg ?? `Provider ${providerCode} call failed`);
    this.providerCode = providerCode;
    this.cause = cause;
  }
}

/** Referenced aggregate does not exist. */
export class NotFound extends ApplicationError {
  public readonly kind: string;
  public readonly id: string;
  constructor(kind: string, id: string) {
    super(`${kind} not found: ${id}`);
    this.kind = kind;
    this.id = id;
  }
}

/** Verification terminated without a matching session (replayed webhook). */
export class UnknownProviderSession extends ApplicationError {
  constructor(providerSessionId: string) {
    super(`No session for providerSessionId=${providerSessionId.slice(0, 12)}…`);
  }
}
