/**
 * MetricsPort — Prometheus-compatible metrics abstraction.
 *
 * Contracts:
 *  - Instrument creation (`counter`, `histogram`, `gauge`) MUST be idempotent
 *    for the same (name, label-keys) pair. Adapters cache handles internally.
 *  - Metric names MUST NOT contain PII; labels MUST be low-cardinality
 *    (tenant, provider code, result) — never raw identifiers.
 */

export interface CounterHandle {
  inc(n?: number): void;
}

export interface HistogramHandle {
  observe(value: number): void;
}

export interface GaugeHandle {
  set(value: number): void;
  inc(n?: number): void;
  dec(n?: number): void;
}

export interface MetricsPort {
  counter(name: string, labels?: Record<string, string>): CounterHandle;
  histogram(name: string, labels?: Record<string, string>): HistogramHandle;
  gauge(name: string, labels?: Record<string, string>): GaugeHandle;
}
