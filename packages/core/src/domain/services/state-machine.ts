import { InvalidVerificationStateTransition } from "../errors.js";

export type VerificationStatus = "INITIATED" | "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";

/**
 * Explicit allowed transitions per spec §4.2.
 * Terminal states (VERIFIED, FAILED, EXPIRED) have no outbound edges.
 */
const TRANSITIONS: Record<VerificationStatus, readonly VerificationStatus[]> = {
  INITIATED: ["PENDING", "EXPIRED"],
  PENDING: ["VERIFIED", "FAILED", "EXPIRED"],
  VERIFIED: [],
  FAILED: [],
  EXPIRED: [],
};

export const VerificationStateMachine = {
  canTransition(from: VerificationStatus, to: VerificationStatus): boolean {
    return TRANSITIONS[from].includes(to);
  },
  assertTransition(from: VerificationStatus, to: VerificationStatus): void {
    if (!VerificationStateMachine.canTransition(from, to)) {
      throw new InvalidVerificationStateTransition(from, to);
    }
  },
  isTerminal(status: VerificationStatus): boolean {
    return TRANSITIONS[status].length === 0;
  },
  allowedNext(status: VerificationStatus): readonly VerificationStatus[] {
    return TRANSITIONS[status];
  },
} as const;
