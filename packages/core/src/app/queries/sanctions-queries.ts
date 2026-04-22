import type { SanctionsMatch } from "../../domain/entities/sanctions-match.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

import type { VerificationRepositoryPort } from "../ports/verification-repository-port.js";

/**
 * GetSanctionsMatches — returns matches for a subject, optionally filtered
 * by review status. Used by dashboards and exports.
 */

export interface GetSanctionsMatchesInput {
  readonly subjectId: UUID;
  readonly status?: "PENDING" | "CONFIRMED_MATCH" | "FALSE_POSITIVE";
  readonly limit?: number;
}

export interface GetSanctionsMatchesOutput {
  readonly matches: readonly SanctionsMatch[];
  readonly total: number;
}

export interface GetSanctionsMatchesDeps {
  readonly repository: VerificationRepositoryPort;
}

export class GetSanctionsMatches {
  constructor(private readonly deps: GetSanctionsMatchesDeps) {}
  async execute(input: GetSanctionsMatchesInput): Promise<GetSanctionsMatchesOutput> {
    const matches = await this.deps.repository.listMatchesBySubject({
      subjectId: input.subjectId,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });
    return { matches, total: matches.length };
  }
}
