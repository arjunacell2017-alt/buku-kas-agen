export function rupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "Rp0";
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toLocaleString("id-ID");
  return `${neg ? "-" : ""}Rp${s}`;
}

/** Rupiah dengan tanda +/- untuk mutasi */
export function rupiahMutasi(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : ""}${rupiah(n)}`;
}

/** ISO yyyy-mm-dd -> dd/mm/yyyy */
export function tanggalID(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function jamID(t: string | null | undefined): string {
  if (!t) return "-";
  return t.slice(0, 5);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function nowTime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export type Periode = "hari" | "kemarin" | "minggu" | "bulan" | "bulanlalu" | "custom";

export const PERIODE_LABEL: [Periode, string][] = [
  ["hari", "Hari Ini"],
  ["custom", "Custom"],
];

export function rangeFromPeriode(p: Periode): { from: string; to: string } {
  const now = new Date();
  if (p === "hari") return { from: toISODate(now), to: toISODate(now) };
  if (p === "kemarin") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { from: toISODate(y), to: toISODate(y) };
  }
  if (p === "minggu") {
    const day = (now.getDay() + 6) % 7; // senin = 0
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    return { from: toISODate(start), to: toISODate(now) };
  }
  if (p === "bulanlalu") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISODate(start), to: toISODate(end) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(start), to: toISODate(now) };
}

/** Bersihkan input nominal: hanya angka, tidak negatif */
export function parseNominal(v: string): number {
  const n = Number(String(v).replace(/[^0-9]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}
