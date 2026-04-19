/**
 * Deterministic JSON serialization for hash-chained audit:
 * - keys sorted alphabetically, recursively
 * - no whitespace
 * - arrays preserve order
 * - bigint serialized as "<n>n" suffix (Node 22 cannot JSON.stringify bigint natively)
 * - Date serialized as ISO string
 * - undefined keys omitted
 */
export function canonicalJson(value: unknown): string {
  return stringify(value);
}

function stringify(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "bigint") return JSON.stringify(`${v.toString()}n`);
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return `[${v.map(stringify).join(",")}]`;
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const body = entries.map(([k, val]) => `${JSON.stringify(k)}:${stringify(val)}`).join(",");
    return `{${body}}`;
  }
  // string, number, boolean — standard JSON handles these deterministically
  return JSON.stringify(v);
}
