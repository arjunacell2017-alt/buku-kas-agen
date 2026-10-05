/**
 * Aturan dampak transaksi terhadap kas & rekening.
 * Modular: cukup ubah/ tambah entri di ARAH_NOMINAL untuk jenis baru.
 */

export type MetodeFee = "Tunai" | "Saldo";
export type MetodeBiaya = "Tunai" | "Saldo" | "Tidak Ada";

export type InputTransaksi = {
  transaction_type: string;
  amount: number;
  fee: number;
  fee_method: string;
  transaction_cost: number;
  cost_method: string;
};

export type Mutasi = {
  mutasiRekening: number;
  mutasiKas: number;
  pendapatanFee: number;
  biaya: number;
};

/**
 * Arah nominal: tanda mutasi rekening untuk nominal transaksi.
 * +1 = rekening bertambah & kas berkurang (uang keluar dari laci).
 * -1 = rekening berkurang & kas bertambah (agen terima uang tunai).
 */
const ARAH_NOMINAL: Record<string, 1 | -1> = {
  "Tarik Tunai": 1,
  "Setor Tunai": -1,
  Transfer: -1,
  Pembayaran: -1,
  Pulsa: -1,
  "Token PLN": -1,
  BRIVA: -1,
  "Top Up": -1,
  Lainnya: -1,
};

export function hitungMutasi(t: InputTransaksi): Mutasi {
  // Fee Masuk: fee yang sudah dicatat sebelumnya kini masuk ke rekening.
  // Hanya menambah saldo rekening; tidak menyentuh kas dan bukan pendapatan baru.
  if (t.transaction_type === "Fee Masuk") {
    return { mutasiRekening: Math.max(0, Number(t.amount) || 0), mutasiKas: 0, pendapatanFee: 0, biaya: 0 };
  }
  const arah = ARAH_NOMINAL[t.transaction_type] ?? -1;
  const nominal = Math.max(0, Number(t.amount) || 0);
  const fee = Math.max(0, Number(t.fee) || 0);
  const biaya = Math.max(0, Number(t.transaction_cost) || 0);

  const feeKeSaldo = t.fee_method === "Saldo";
  const biayaTunai = t.cost_method === "Tunai";
  const biayaSaldo = t.cost_method === "Saldo";

  return {
    mutasiRekening:
      arah * nominal + (feeKeSaldo ? fee : 0) - (biayaSaldo ? biaya : 0),
    mutasiKas: -arah * nominal + (feeKeSaldo ? 0 : fee) - (biayaTunai ? biaya : 0),
    pendapatanFee: fee,
    biaya,
  };
}

export const tandaRupiah = (n: number) => (n > 0 ? "+" : "");

/**
 * Pecah mutasi rekening per rekening bank.
 * Nominal + fee saldo → rekening transaksi; biaya saldo → rekening biaya
 * (bila kosong, rekening transaksi). Jumlahnya selalu = mutasiRekening.
 */
export function mutasiPerRekening(
  t: InputTransaksi & { account_id?: string | null; cost_account_id?: string | null },
): { account_id: string | null; amount: number }[] {
  const m = hitungMutasi(t);
  const biayaSaldo = t.transaction_type !== "Fee Masuk" && t.cost_method === "Saldo" ? m.biaya : 0;
  const utama = m.mutasiRekening + biayaSaldo;
  const out: { account_id: string | null; amount: number }[] = [];
  if (utama !== 0) out.push({ account_id: t.account_id ?? null, amount: utama });
  if (biayaSaldo !== 0)
    out.push({ account_id: t.cost_account_id ?? t.account_id ?? null, amount: -biayaSaldo });
  return out;
}
