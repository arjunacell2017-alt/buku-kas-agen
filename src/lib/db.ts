import { supabase } from "@/integrations/supabase/client";
import { hitungMutasi } from "@/lib/aturan";

export type Settings = {
  id?: string;
  business_name: string;
  start_date: string;
  opening_cash_balance: number;
  opening_bank_balance: number;
  actual_cash_balance: number;
  actual_bank_balance: number;
};

export const DEFAULT_SETTINGS: Settings = {
  business_name: "Agen BRILink",
  start_date: new Date().toISOString().slice(0, 10),
  opening_cash_balance: 0,
  opening_bank_balance: 0,
  actual_cash_balance: 0,
  actual_bank_balance: 0,
};

export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Belum masuk");
  return data.user.id;
}

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("account_settings")
    .select(
      "id,business_name,start_date,opening_cash_balance,opening_bank_balance,actual_cash_balance,actual_bank_balance",
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    id: data.id,
    business_name: data.business_name,
    start_date: data.start_date,
    opening_cash_balance: Number(data.opening_cash_balance),
    opening_bank_balance: Number(data.opening_bank_balance),
    actual_cash_balance: Number(data.actual_cash_balance),
    actual_bank_balance: Number(data.actual_bank_balance),
  };
}

export async function saveSettings(s: Settings) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from("account_settings")
    .upsert({ ...s, user_id }, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Posisi dana: saldo awal + seluruh mutasi (transaksi otomatis + catatan
 * kas/rekening manual). Saldo tidak pernah disimpan, selalu dihitung ulang.
 */
export async function fetchSaldo() {
  const [settings, tx, kas, bank] = await Promise.all([
    fetchSettings(),
    supabase
      .from("transactions")
      .select("transaction_type,amount,fee,fee_method,transaction_cost,cost_method"),
    supabase.from("cash_transactions").select("type,amount"),
    supabase.from("bank_transactions").select("debit,credit"),
  ]);
  if (tx.error) throw tx.error;
  if (kas.error) throw kas.error;
  if (bank.error) throw bank.error;

  let mutasiKasTx = 0;
  let mutasiBankTx = 0;
  let feeTunai = 0;
  let feeSaldo = 0;
  let biayaTransaksi = 0;
  // Kredit = seluruh mutasi rekening positif, Debit = nilai absolut mutasi negatif.
  let kredit = 0;
  let debit = 0;
  const catatMutasiBank = (m: number) => {
    if (m > 0) kredit += m;
    else if (m < 0) debit += -m;
  };
  // Kas Masuk = seluruh mutasi kas positif, Kas Keluar = nilai absolut mutasi negatif.
  let kasMasuk = 0;
  let kasKeluar = 0;
  const catatMutasiKas = (m: number) => {
    if (m > 0) kasMasuk += m;
    else if (m < 0) kasKeluar += -m;
  };

  for (const r of tx.data ?? []) {
    const m = hitungMutasi(r);
    mutasiKasTx += m.mutasiKas;
    mutasiBankTx += m.mutasiRekening;
    catatMutasiBank(m.mutasiRekening);
    catatMutasiKas(m.mutasiKas);
    if (r.fee_method === "Saldo") feeSaldo += Number(r.fee);
    else feeTunai += Number(r.fee);
    biayaTransaksi += m.biaya;
  }

  // Catatan kas manual ikut dihitung sebagai mutasi kas.
  let masuk = 0;
  let keluar = 0;
  for (const r of kas.data ?? []) {
    const amt = Number(r.amount);
    if (r.type === "Kas Masuk") masuk += amt;
    else keluar += amt;
    catatMutasiKas(r.type === "Kas Masuk" ? amt : -amt);
  }

  let mutasiBankManual = 0;
  for (const r of bank.data ?? []) {
    const m = Number(r.credit) - Number(r.debit);
    mutasiBankManual += m;
    catatMutasiBank(m);
  }

  const saldoKas = settings.opening_cash_balance + kasMasuk - kasKeluar;
  const saldoBank = settings.opening_bank_balance + kredit - debit;

  return {
    settings,
    masuk,
    keluar,
    kasMasuk,
    kasKeluar,
    debit,
    kredit,
    mutasiKasTx,
    mutasiBankTx,
    mutasiBankManual,
    feeTunai,
    feeSaldo,
    totalFee: feeTunai + feeSaldo,
    biayaTransaksi,
    saldoKas,
    saldoBank,
    totalDana: saldoKas + saldoBank,
    selisihKas: settings.actual_cash_balance - saldoKas,
    selisihBank: settings.actual_bank_balance - saldoBank,
  };
}

/** Ringkasan transaksi + biaya untuk sebuah rentang tanggal */
export async function fetchRingkasan(from: string, to: string) {
  const [tx, exp] = await Promise.all([
    supabase
      .from("transactions")
      .select("transaction_type,amount,fee,fee_method,transaction_cost,cost_method")
      .gte("transaction_date", from)
      .lte("transaction_date", to),
    supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
  ]);
  if (tx.error) throw tx.error;
  if (exp.error) throw exp.error;

  const rows = tx.data ?? [];
  let totalNominal = 0;
  let feeTunai = 0;
  let feeSaldo = 0;
  let biayaTransaksi = 0;
  const perJenis = new Map<string, { jumlah: number; nominal: number; fee: number }>();

  for (const r of rows) {
    totalNominal += Number(r.amount);
    if (r.fee_method === "Saldo") feeSaldo += Number(r.fee);
    else feeTunai += Number(r.fee);
    biayaTransaksi += Number(r.transaction_cost);
    const p = perJenis.get(r.transaction_type) ?? { jumlah: 0, nominal: 0, fee: 0 };
    p.jumlah += 1;
    p.nominal += Number(r.amount);
    p.fee += Number(r.fee);
    perJenis.set(r.transaction_type, p);
  }

  const biayaOperasional = (exp.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const totalFee = feeTunai + feeSaldo;
  const totalBiaya = biayaOperasional + biayaTransaksi;

  return {
    jumlah: rows.length,
    totalNominal,
    feeTunai,
    feeSaldo,
    totalFee,
    biayaOperasional,
    biayaTransaksi,
    totalBiaya,
    laba: totalFee - totalBiaya,
    perJenis: [...perJenis.entries()].map(([jenis, v]) => ({ jenis, ...v })),
  };
}
