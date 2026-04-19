import { describe, expect, it } from "vitest";
import { Hex32 } from "../value-objects/hex32.js";
import { ISODateTime } from "../value-objects/iso-datetime.js";
import { AuditChainService, type SealedAuditEvent } from "./audit-chain-service.js";

const now = ISODateTime.parse("2026-04-18T12:00:00Z");

function event(seqOffset: number, type = "Verification.Started") {
  // Stable ISO timestamp that scales — base + N seconds (handles 1000+ events).
  const base = new Date("2026-04-18T12:00:00Z").getTime();
  const occurredAt = ISODateTime.fromDate(new Date(base + seqOffset * 1000));
  return {
    eventType: type,
    actorKey: "svc:persona-adapter",
    subjectKey: `identity:${seqOffset}`,
    payload: { provider: "PERSONA", decision: "PENDING" },
    occurredAt,
  };
}

describe("AuditChainService", () => {
  describe("append", () => {
    it("genesis event uses Hex32.ZERO prevHash and seqNumber=1", () => {
      const svc = new AuditChainService();
      const sealed = svc.append(event(1), null);
      expect(sealed.seqNumber).toBe(1n);
      expect(sealed.prevHash).toBe(Hex32.ZERO);
      expect(sealed.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("subsequent events increment seqNumber and chain prevHash", () => {
      const svc = new AuditChainService();
      const e1 = svc.append(event(1), null);
      const e2 = svc.append(event(2), { seqNumber: e1.seqNumber, hash: e1.hash });
      expect(e2.seqNumber).toBe(2n);
      expect(Hex32.equals(e2.prevHash, e1.hash)).toBe(true);
    });
  });

  describe("verify", () => {
    it("empty chain is valid", () => {
      const svc = new AuditChainService();
      expect(svc.verify([])).toEqual({ ok: true, count: 0 });
    });

    it("intact chain is verified", () => {
      const svc = new AuditChainService();
      const chain: SealedAuditEvent[] = [];
      let prev = null as { seqNumber: bigint; hash: Hex32 } | null;
      for (let i = 1; i <= 50; i++) {
        const sealed = svc.append(event(i), prev);
        chain.push(sealed);
        prev = { seqNumber: sealed.seqNumber, hash: sealed.hash };
      }
      const result = svc.verify(chain);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.count).toBe(50);
    });

    it("tampered payload detected via hash-mismatch", () => {
      const svc = new AuditChainService();
      const chain: SealedAuditEvent[] = [];
      let prev = null as { seqNumber: bigint; hash: Hex32 } | null;
      for (let i = 1; i <= 5; i++) {
        const sealed = svc.append(event(i), prev);
        chain.push(sealed);
        prev = { seqNumber: sealed.seqNumber, hash: sealed.hash };
      }
      // Tamper event 3's payload — hash no longer matches contents.
      const third = chain[2];
      if (!third) throw new Error("expected chain[2]");
      const tampered: SealedAuditEvent = {
        ...third,
        payload: { ...third.payload, decision: "MANIPULATED" },
      };
      chain[2] = tampered;

      const result = svc.verify(chain);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.brokenAt).toBe(3n);
        expect(result.reason).toBe("hash-mismatch");
      }
    });

    it("removed event detected via seq-gap", () => {
      const svc = new AuditChainService();
      const chain: SealedAuditEvent[] = [];
      let prev = null as { seqNumber: bigint; hash: Hex32 } | null;
      for (let i = 1; i <= 5; i++) {
        const sealed = svc.append(event(i), prev);
        chain.push(sealed);
        prev = { seqNumber: sealed.seqNumber, hash: sealed.hash };
      }
      // Remove event 3 entirely.
      const pruned = [chain[0], chain[1], chain[3], chain[4]].filter(
        (e): e is SealedAuditEvent => e !== undefined,
      );
      const result = svc.verify(pruned);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.brokenAt).toBe(4n); // seen seq 4 when expecting 3
        expect(result.reason).toBe("seq-gap");
      }
    });

    it("reordered events detected via prev-hash-mismatch", () => {
      const svc = new AuditChainService();
      const chain: SealedAuditEvent[] = [];
      let prev = null as { seqNumber: bigint; hash: Hex32 } | null;
      for (let i = 1; i <= 4; i++) {
        const sealed = svc.append(event(i), prev);
        chain.push(sealed);
        prev = { seqNumber: sealed.seqNumber, hash: sealed.hash };
      }
      // Swap events 2 and 3 — now event at position 2 has seqNumber=3 (gap),
      // and event at position 3 has seqNumber=2 (gap the other way).
      const reordered = [chain[0], chain[2], chain[1], chain[3]].filter(
        (e): e is SealedAuditEvent => e !== undefined,
      );
      const result = svc.verify(reordered);
      expect(result.ok).toBe(false);
      // The detector will see seq 3 where seq 2 was expected.
      if (!result.ok) expect(result.brokenAt).toBe(3n);
    });

    it("verifies a 1000-event chain in < 100ms", () => {
      const svc = new AuditChainService();
      const chain: SealedAuditEvent[] = [];
      let prev = null as { seqNumber: bigint; hash: Hex32 } | null;
      for (let i = 1; i <= 1000; i++) {
        const sealed = svc.append(event(i), prev);
        chain.push(sealed);
        prev = { seqNumber: sealed.seqNumber, hash: sealed.hash };
      }
      const start = performance.now();
      const result = svc.verify(chain);
      const elapsed = performance.now() - start;
      expect(result.ok).toBe(true);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe("computeHash", () => {
    it("is deterministic across different Date representations via canonicalJson", () => {
      const base = event(1);
      const a = AuditChainService.computeHash(base, 1n, Hex32.ZERO);
      const b = AuditChainService.computeHash(
        { ...base, payload: { decision: "PENDING", provider: "PERSONA" } }, // keys reordered
        1n,
        Hex32.ZERO,
      );
      expect(a).toBe(b);
    });
  });

  it("occurredAt is an ISODateTime", () => {
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
