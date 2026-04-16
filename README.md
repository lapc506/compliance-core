# compliance-core

TypeScript library for **KYC, KYB, AML, age verification, sanctions screening, and proof-of-personhood** as a sidecar companion to startup backends. Unifies multi-provider integrations (Persona, Ondato, Incode, Snap Compliance, WorldID, zk-Proof-of-Humanity) behind stable ports and gRPC services.

**Status**: **Pre-alpha**. Design spec approved 2026-04-16. Priority **#2** after `invoice-core` in the ecosystem roadmap.

## Why

Scored **5/5 with multiple double-checks** against the governance rubric — the strongest justification of any proposed `-core` in the ecosystem. Drivers:

- **Ley 8204 CR** applies to HabitaNexus escrow (movements > USD 1000/mo); without formal KYC the platform operates as "actividad financiera no supervisada" → SUGEF enforcement risk.
- **AltruPets Foundation** requires donor KYB + AML on donation origin (especially for crypto donations or politically exposed donors).
- **AduaNext** requires KYB of customs brokers + sanctions screening on all import/export parties.
- **Vertivolatam** requires KYB of enterprise buyers + sanctions screening on international shipments.

All 4 startups use it → maximum reuse score.

## Architecture

- **Hexagonal** (Explicit Architecture, Herbert Graca).
- **gRPC sidecar** (`:50071`) with dual deployment: K8s sidecar or standalone Docker.
- **TypeScript 5.x strict** on Node 22 LTS.
- **12 ports** covering identity verification, KYB, age, sanctions, PEP, adverse media, PoP, AML, whistleblower, audit log, verification repo, credential vault.
- Observability stack aligned with `agentic-core` and `invoice-core`.

## Key capabilities

- **KYC**: document scan + face match + liveness detection + OCR extraction (Persona, Ondato, Incode).
- **KYB**: company registration check + UBO tracking.
- **Age verification**: for consent-sensitive flows.
- **AML**: rule-based transaction monitoring (v1) → ML anomaly detection via Snap Scan Agent (v2).
- **Sanctions screening**: OFAC SDN + UN + EU + PEP + adverse media (daily updates).
- **Proof of Personhood** (P3): WorldID + zk-Proof-of-Humanity integration.
- **Whistleblower channel**: anonymous reporting with chain-of-custody.
- **Audit log**: append-only, SHA-256 chained, 7-year retention (CR AML requirement).

## Design specification

Full approved design: [`docs/superpowers/specs/2026-04-16-compliance-core-design.md`](docs/superpowers/specs/2026-04-16-compliance-core-design.md)

Complementary documents (author's local workspace):

- Governance rubric (applied to all `-core` decisions): `2026-04-16-core-governance-rubric.md`.
- Invoice-core hallazgos (context on Ley 8204 urgency): `2026-04-16-invoice-core-hallazgos.md`.

## Roadmap

| Phase | Content | Gate |
|---|---|---|
| Fase 1 | MVP v0.1: Persona + Ondato + OFAC feed + audit log + gRPC | — |
| Fase 2 | Snap Compliance whistleblower + PEP screening + KYB | — |
| Fase 3 | AML rule engine + Snap Scan Agent ML | AltruPets crypto donations |
| Fase 4 | Proof of Personhood (WorldID + zk-PoH) | Selected use case |
| Fase 5 | v1.0 GA | — |

## Ecosystem

- [`agentic-core`](https://github.com/lapc506/agentic-core) — AI agent orchestration (Python, BSL 1.1).
- `marketplace-core` — product catalog + traceability (TypeScript, MIT).
- [`invoice-core`](https://github.com/lapc506/invoice-core) — multi-country e-invoicing (TypeScript, BSL 1.1).
- `filing-core` — tax declarations (TypeScript, BSL 1.1, deferred to year 2).

## License

[Business Source License 1.1](LICENSE.md). Five-year conversion to Non-Profit OSL 3.0.
