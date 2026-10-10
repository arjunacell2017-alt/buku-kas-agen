import { supabase } from "@/integrations/supabase/client";
import { hitungMutasi, mutasiPerRekening } from "@/lib/aturan";

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
  business_name: "Agen",
  start_date: new Date().toISOString().slice(0, 10),
  opening_cash_balance: 0,
  opening_bank_balance: 0,
  actual_cash_balance: 0,
  actual_bank_balance: 0,
};

export type Rekening = {
  id: string;
  bank_name: string;
  account_number: string | null;
  owner_name: string | null;
  opening_balance: number;
  start_date: string;
  actual_balance: number;
  status: string;
};

export const labelRekening = (r: { bank_name: string; account_number: string | null }) =>
  r.account_number ? `${r.bank_name} - ****${r.account_number.slice(-4)}` : r.bank_name;

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
    .eq("user_id", await getUserId())
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

export async function fetchRekening(): Promise<Rekening[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(
      "id,bank_name,account_number,owner_name,opening_balance,start_date,actual_balance,status",
    )
    .eq("user_id", await getUserId())
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    opening_balance: Number(r.opening_balance),
    actual_balance: Number(r.actual_balance),
  }));
}

export const rekeningQuery = { queryKey: ["rekening-list"], queryFn: fetchRekening };

export async function saveRekening(r: Partial<Rekening> & { bank_name: string }) {
  const payload = {
    bank_name: r.bank_name,
    account_number: r.account_number || null,
    owner_name: r.owner_name || null,
    opening_balance: Math.max(0, Number(r.opening_balance) || 0),
    ...(r.start_date ? { start_date: r.start_date } : {}),
    ...(r.actual_balance !== undefined ? { actual_balance: r.actual_balance } : {}),
    ...(r.status ? { status: r.status } : {}),
  };
  if (r.id) {
    const { error } = await supabase.from("bank_accounts").update(payload).eq("id", r.id);
    if (error) throw error;
  } else {
    const user_id = await getUserId();
    const { error } = await supabase.from("bank_accounts").insert({ ...payload, user_id });
    if (error) throw error;
  }
}

export type PosisiRekening = Rekening & {
  kredit: number;
  debit: number;
  saldo: number;
  selisih: number;
};

/**
 * Posisi dana: saldo awal + seluruh mutasi (transaksi otomatis + catatan
 * kas/rekening manual). Saldo tidak pernah disimpan, selalu dihitung ulang.
 * Saldo rekening dihitung per rekening lalu dijumlahkan.
 */
export async function fetchSaldo() {
  const [settings, rekening, tx, kas, bank] = await Promise.all([
    fetchSettings(),
    fetchRekening(),
    supabase
      .from("transactions")
      .select(
        "transaction_type,amount,fee,fee_method,transaction_cost,cost_method,account_id,cost_account_id",
      )
      .eq("user_id", await getUserId()),
    supabase
      .from("cash_transactions")
      .select("type,amount")
      .eq("user_id", await getUserId()),
    supabase
      .from("bank_transactions")
      .select("debit,credit,account_id")
      .eq("user_id", await getUserId()),
  ]);
  if (tx.error) throw tx.error;
  if (kas.error) throw kas.error;
  if (bank.error) throw bank.error;

  const fallbackId = rekening.find((r) => r.status === "aktif")?.id ?? rekening[0]?.id ?? "";
  const perRek = new Map<string, { kredit: number; debit: number }>();
  const catatRek = (id: string | null, m: number) => {
    const key = id && perRek.has(id) ? id : (id ?? fallbackId);
    const p = perRek.get(key) ?? { kredit: 0, debit: 0 };
    if (m > 0) p.kredit += m;
    else if (m < 0) p.debit += -m;
    perRek.set(key, p);
  };
  for (const r of rekening) perRek.set(r.id, { kredit: 0, debit: 0 });

  let mutasiKasTx = 0;
  let mutasiBankTx = 0;
  let feeTunai = 0;
  let feeSaldo = 0;
  let biayaTransaksi = 0;
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
    for (const p of mutasiPerRekening(r)) catatRek(p.account_id, p.amount);
    catatMutasiKas(m.mutasiKas);
    if (r.transaction_type === "Fee Masuk" || r.fee_method === "Saldo") feeSaldo += m.pendapatanFee;
    else feeTunai += m.pendapatanFee;
    biayaTransaksi += m.biaya;
  }

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
    catatRek(r.account_id, m);
  }

  const perRekening: PosisiRekening[] = rekening.map((r) => {
    const p = perRek.get(r.id) ?? { kredit: 0, debit: 0 };
    const saldo = r.opening_balance + p.kredit - p.debit;
    return { ...r, ...p, saldo, selisih: r.actual_balance - saldo };
  });
  // Mutasi tanpa rekening (hanya terjadi bila client belum punya rekening sama sekali)
  const lepas = perRek.get("") ?? { kredit: 0, debit: 0 };

  const sumR = (f: (r: PosisiRekening) => number) => perRekening.reduce((a, r) => a + f(r), 0);
  const openingBank = sumR((r) => r.opening_balance);
  const kredit = sumR((r) => r.kredit) + lepas.kredit;
  const debit = sumR((r) => r.debit) + lepas.debit;
  const aktualBank = sumR((r) => r.actual_balance);

  const saldoKas = settings.opening_cash_balance + kasMasuk - kasKeluar;
  const saldoBank = openingBank + kredit - debit;

  return {
    settings,
    perRekening,
    openingBank,
    aktualBank,
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
    selisihBank: aktualBank - saldoBank,
  };
}

/** Ringkasan transaksi + biaya untuk sebuah rentang tanggal (opsional per rekening) */
export async function fetchRingkasan(from: string, to: string, accountId?: string) {
  let txq = supabase
    .from("transactions")
    .select("transaction_type,amount,fee,fee_method,transaction_cost,cost_method")
    .eq("user_id", await getUserId())
    .gte("transaction_date", from)
    .lte("transaction_date", to);
  if (accountId) txq = txq.eq("account_id", accountId);
  const [tx, exp] = await Promise.all([
    txq,
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", await getUserId())
      .gte("expense_date", from)
      .lte("expense_date", to),
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
    const m = hitungMutasi(r);
    totalNominal += Number(r.amount);
    if (r.transaction_type === "Fee Masuk" || r.fee_method === "Saldo") feeSaldo += m.pendapatanFee;
    else feeTunai += m.pendapatanFee;
    biayaTransaksi += m.biaya;
    const p = perJenis.get(r.transaction_type) ?? { jumlah: 0, nominal: 0, fee: 0 };
    p.jumlah += 1;
    p.nominal += Number(r.amount);
    p.fee += m.pendapatanFee;
    perJenis.set(r.transaction_type, p);
  }

  const biayaOperasional = accountId
    ? 0
    : (exp.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
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
