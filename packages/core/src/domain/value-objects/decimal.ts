import { InvalidDecimal } from "../errors.js";

/**
 * Fixed-precision decimal backed by (bigint value, integer scale).
 * Avoids float rounding in risk scores, confidences, and monetary math.
 *
 * Example: 85.42 yields { value: 8542n, scale: 2 }.
 */
export class Decimal {
  private constructor(
    public readonly value: bigint,
    public readonly scale: number,
  ) {
    if (!Number.isInteger(scale) || scale < 0) {
      throw new InvalidDecimal(`Scale must be non-negative integer, got ${scale}`);
    }
  }

  static fromNumber(n: number, scale = 2): Decimal {
    if (!Number.isFinite(n)) throw new InvalidDecimal("Not a finite number");
    const factor = 10 ** scale;
    return new Decimal(BigInt(Math.round(n * factor)), scale);
  }

  static fromString(s: string): Decimal {
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s.trim());
    if (!m) throw new InvalidDecimal(`Unparseable decimal: ${s}`);
    const sign = m[1] === "-" ? -1n : 1n;
    const whole = BigInt(m[2] ?? "0");
    const frac = m[3] ?? "";
    const scale = frac.length;
    const value = sign * (whole * 10n ** BigInt(scale) + BigInt(frac || "0"));
    return new Decimal(value, scale);
  }

  static fromRaw(value: bigint, scale: number): Decimal {
    return new Decimal(value, scale);
  }

  toNumber(): number {
    return Number(this.value) / 10 ** this.scale;
  }

  toString(): string {
    if (this.scale === 0) return this.value.toString();
    const negative = this.value < 0n;
    const abs = negative ? -this.value : this.value;
    const str = abs.toString().padStart(this.scale + 1, "0");
    const cut = str.length - this.scale;
    const whole = str.slice(0, cut);
    const frac = str.slice(cut);
    return `${negative ? "-" : ""}${whole}.${frac}`;
  }

  equals(other: Decimal): boolean {
    const maxScale = Math.max(this.scale, other.scale);
    const a = this.value * 10n ** BigInt(maxScale - this.scale);
    const b = other.value * 10n ** BigInt(maxScale - other.scale);
    return a === b;
  }

  toJSON(): string {
    return this.toString();
  }
}
