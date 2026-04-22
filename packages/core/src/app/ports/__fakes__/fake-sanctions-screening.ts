import type { SanctionsList, SanctionsMatch } from "../../../domain/entities/sanctions-match.js";
import { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import type { UUID } from "../../../domain/value-objects/uuid.js";
import type {
  MatchResolution,
  RefreshReport,
  SanctionsScreeningPort,
  ScreeningSubject,
} from "../sanctions-screening-port.js";

export class FakeSanctionsScreening implements SanctionsScreeningPort {
  readonly screenCalls: ScreeningSubject[] = [];
  private readonly matches = new Map<string, SanctionsMatch>();
  private nextMatches: readonly SanctionsMatch[] = [];

  /** Seed: the next call to screen() returns these matches. */
  queueMatches(ms: readonly SanctionsMatch[]): void {
    this.nextMatches = ms;
    for (const m of ms) this.matches.set(m.props.id, m);
  }

  async screen(subject: ScreeningSubject): Promise<readonly SanctionsMatch[]> {
    this.screenCalls.push(subject);
    const out = this.nextMatches;
    this.nextMatches = [];
    return out;
  }

  async refreshLists(source: SanctionsList): Promise<RefreshReport> {
    return {
      source,
      fetchedAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
      entriesAdded: 0,
      entriesRemoved: 0,
      entriesUpdated: 0,
    };
  }

  async getMatch(id: UUID): Promise<SanctionsMatch | null> {
    return this.matches.get(id) ?? null;
  }

  async resolveMatch(id: UUID, resolution: MatchResolution): Promise<SanctionsMatch> {
    const existing = this.matches.get(id);
    if (!existing) throw new Error(`unknown match: ${id}`);
    const at = ISODateTime.parse("2026-04-20T12:00:00.000Z");
    const resolved =
      resolution.kind === "CONFIRMED_MATCH"
        ? existing.confirm(resolution.reviewer, at, resolution.notes)
        : existing.markFalsePositive(resolution.reviewer, at, resolution.notes);
    this.matches.set(id, resolved);
    return resolved;
  }
}
