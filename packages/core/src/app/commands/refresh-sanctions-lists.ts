import type { SanctionsList } from "../../domain/entities/sanctions-match.js";
import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import { UUID } from "../../domain/value-objects/uuid.js";

import type { AuditLogPort } from "../ports/audit-log-port.js";
import type { ClockPort } from "../ports/clock-port.js";
import type { EventBusPort } from "../ports/event-bus-port.js";
import type { RefreshReport, SanctionsScreeningPort } from "../ports/sanctions-screening-port.js";

/**
 * Synthetic aggregate UUID for list-refresh events. `ListRefreshed` is not
 * tied to a subject entity, so we use a stable nil-v4 UUID that is valid
 * RFC 4122 and distinguishable from any real aggregate.
 */
const LIST_REFRESH_AGGREGATE = UUID.parse("00000000-0000-4000-8000-000000000000");

/**
 * RefreshSanctionsLists — invoked by the daily cron. Calls the adapter's
 * `refreshLists(source)`, appends a `ListRefreshed` audit event, and
 * publishes the matching domain event.
 */

export interface RefreshSanctionsListsInput {
  readonly actorKey: string; // e.g. "cron:sanctions-refresh"
  readonly source: SanctionsList;
}

export type RefreshSanctionsListsOutput = RefreshReport;

export interface RefreshSanctionsListsDeps {
  readonly clock: ClockPort;
  readonly sanctions: SanctionsScreeningPort;
  readonly auditLog: AuditLogPort;
  readonly eventBus: EventBusPort;
}

export class RefreshSanctionsLists {
  constructor(private readonly deps: RefreshSanctionsListsDeps) {}

  async execute(input: RefreshSanctionsListsInput): Promise<RefreshSanctionsListsOutput> {
    const report = await this.deps.sanctions.refreshLists(input.source);
    const now = ISODateTime.fromDate(this.deps.clock.now());

    await this.deps.auditLog.append({
      eventType: "ListRefreshed",
      actorKey: input.actorKey,
      subjectKey: `sanctions-list:${input.source}`,
      payload: {
        source: report.source,
        entriesAdded: report.entriesAdded,
        entriesRemoved: report.entriesRemoved,
        entriesUpdated: report.entriesUpdated,
      },
      occurredAt: now,
    });

    await this.deps.eventBus.publish({
      eventType: "ListRefreshed",
      aggregateId: LIST_REFRESH_AGGREGATE,
      occurredAt: now,
      payload: {
        source: report.source,
        entriesAdded: report.entriesAdded,
        entriesRemoved: report.entriesRemoved,
        entriesUpdated: report.entriesUpdated,
      },
    });

    return report;
  }
}
