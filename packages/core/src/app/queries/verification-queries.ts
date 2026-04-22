import type { VerificationSession } from "../../domain/entities/verification-session.js";
import type { VerificationStatus } from "../../domain/services/state-machine.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../domain/value-objects/uuid.js";

import { NotFound } from "../errors.js";
import type { VerificationRepositoryPort } from "../ports/verification-repository-port.js";

/**
 * GetVerificationStatus — returns the current session state or throws NotFound.
 */

export interface GetVerificationStatusInput {
  readonly sessionId: UUID;
}

export interface GetVerificationStatusDeps {
  readonly repository: VerificationRepositoryPort;
}

export class GetVerificationStatus {
  constructor(private readonly deps: GetVerificationStatusDeps) {}
  async execute(input: GetVerificationStatusInput): Promise<VerificationSession> {
    const s = await this.deps.repository.getSession(input.sessionId);
    if (!s) throw new NotFound("VerificationSession", input.sessionId);
    return s;
  }
}

/**
 * ListVerifications — paginated session listing for a subject.
 */

export interface ListVerificationsInput {
  readonly subjectId: UUID;
  readonly status?: VerificationStatus;
  readonly from?: ISODateTime;
  readonly to?: ISODateTime;
  readonly limit?: number;
}

export interface ListVerificationsOutput {
  readonly sessions: readonly VerificationSession[];
  readonly total: number;
}

export interface ListVerificationsDeps {
  readonly repository: VerificationRepositoryPort;
}

export class ListVerifications {
  constructor(private readonly deps: ListVerificationsDeps) {}
  async execute(input: ListVerificationsInput): Promise<ListVerificationsOutput> {
    const sessions = await this.deps.repository.listSessionsBySubject({
      subjectId: input.subjectId,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.from !== undefined ? { from: input.from } : {}),
      ...(input.to !== undefined ? { to: input.to } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });
    return { sessions, total: sessions.length };
  }
}
