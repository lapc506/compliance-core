import type { VerificationSession } from "../../../domain/entities/verification-session.js";
import { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../../domain/value-objects/uuid.js";
import type {
  EvidenceBundle,
  IdentityVerificationPort,
  QuickCheckResult,
  StartVerificationInput,
  StartVerificationOutput,
} from "../identity-verification-port.js";

/**
 * Deterministic fake for tests. `startVerification` always succeeds with a
 * canned providerSessionId; `getSessionStatus` serves the session registered
 * via `registerSession`.
 */
export class FakeIdentityVerification implements IdentityVerificationPort {
  readonly startCalls: StartVerificationInput[] = [];
  private readonly sessions = new Map<string, VerificationSession>();
  private readonly evidence = new Map<string, EvidenceBundle>();
  private counter = 0;

  registerSession(session: VerificationSession): void {
    this.sessions.set(session.id, session);
  }

  registerEvidence(bundle: EvidenceBundle): void {
    this.evidence.set(bundle.sessionId, bundle);
  }

  async startVerification(input: StartVerificationInput): Promise<StartVerificationOutput> {
    this.startCalls.push(input);
    this.counter += 1;
    return {
      providerSessionId: `fake-inq-${this.counter}`,
      hostedFlowUrl: `https://fake.example/flow/${this.counter}`,
      expiresAt: ISODateTime.parse("2026-04-21T12:00:00.000Z"),
    };
  }

  async getSessionStatus(sessionId: UUID): Promise<VerificationSession> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`unknown session: ${sessionId}`);
    return s;
  }

  async fetchEvidence(sessionId: UUID): Promise<EvidenceBundle> {
    const e = this.evidence.get(sessionId);
    if (!e) throw new Error(`no evidence for session: ${sessionId}`);
    return e;
  }

  async quickCheck(receiverId: string): Promise<QuickCheckResult> {
    return {
      receiverId,
      signal: "UNKNOWN",
      checkedAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
    };
  }
}
