import type { Identity } from "../../../domain/entities/identity.js";
import type { SanctionsMatch } from "../../../domain/entities/sanctions-match.js";
import type { VerificationSession } from "../../../domain/entities/verification-session.js";
import type { UUID } from "../../../domain/value-objects/uuid.js";
import type {
  ListMatchesFilter,
  ListSessionsFilter,
  VerificationRepositoryPort,
} from "../verification-repository-port.js";

export class FakeVerificationRepository implements VerificationRepositoryPort {
  private readonly identities = new Map<string, Identity>();
  private readonly sessions = new Map<string, VerificationSession>();
  private readonly matches = new Map<string, SanctionsMatch>();

  async saveIdentity(identity: Identity): Promise<void> {
    this.identities.set(identity.props.id, identity);
  }

  async getIdentity(id: UUID): Promise<Identity | null> {
    return this.identities.get(id) ?? null;
  }

  async saveSession(session: VerificationSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(id: UUID): Promise<VerificationSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async getSessionByProviderRef(providerRef: string): Promise<VerificationSession | null> {
    for (const s of this.sessions.values()) {
      if (s.props.providerRef === providerRef) return s;
    }
    return null;
  }

  async listSessionsBySubject(filter: ListSessionsFilter): Promise<readonly VerificationSession[]> {
    const all = [...this.sessions.values()].filter((s) => s.props.identityId === filter.subjectId);
    const filtered = all.filter((s) => {
      if (filter.status && s.status !== filter.status) return false;
      if (filter.from && s.props.startedAt < filter.from) return false;
      if (filter.to && s.props.startedAt > filter.to) return false;
      return true;
    });
    return filter.limit ? filtered.slice(0, filter.limit) : filtered;
  }

  async saveMatch(match: SanctionsMatch): Promise<void> {
    this.matches.set(match.props.id, match);
  }

  async listMatchesBySubject(filter: ListMatchesFilter): Promise<readonly SanctionsMatch[]> {
    const all = [...this.matches.values()].filter((m) => m.props.identityId === filter.subjectId);
    const filtered = filter.status
      ? all.filter((m) => m.props.reviewStatus === filter.status)
      : all;
    return filter.limit ? filtered.slice(0, filter.limit) : filtered;
  }
}
