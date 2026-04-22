import type { CounterHandle, GaugeHandle, HistogramHandle, MetricsPort } from "../metrics-port.js";

interface Recorded {
  counters: Map<string, number>;
  histograms: Map<string, number[]>;
  gauges: Map<string, number>;
}

function labelKey(name: string, labels?: Record<string, string>): string {
  if (!labels) return name;
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return `${name}{${entries.map(([k, v]) => `${k}=${v}`).join(",")}}`;
}

export class FakeMetrics implements MetricsPort {
  readonly recorded: Recorded = {
    counters: new Map(),
    histograms: new Map(),
    gauges: new Map(),
  };

  counter(name: string, labels?: Record<string, string>): CounterHandle {
    const key = labelKey(name, labels);
    const { counters } = this.recorded;
    return {
      inc: (n = 1) => counters.set(key, (counters.get(key) ?? 0) + n),
    };
  }

  histogram(name: string, labels?: Record<string, string>): HistogramHandle {
    const key = labelKey(name, labels);
    const { histograms } = this.recorded;
    return {
      observe: (v) => {
        const existing = histograms.get(key) ?? [];
        existing.push(v);
        histograms.set(key, existing);
      },
    };
  }

  gauge(name: string, labels?: Record<string, string>): GaugeHandle {
    const key = labelKey(name, labels);
    const { gauges } = this.recorded;
    return {
      set: (v) => gauges.set(key, v),
      inc: (n = 1) => gauges.set(key, (gauges.get(key) ?? 0) + n),
      dec: (n = 1) => gauges.set(key, (gauges.get(key) ?? 0) - n),
    };
  }
}
