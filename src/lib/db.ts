import { supabase } from "@/integrations/supabase/client";

export type Settings = {
  id?: string;
  business_name: string;
  opening_cash_balance: number;
  opening_bank_balance: number;
  actual_cash_balance: number;
  actual_bank_balance: number;
};

export const DEFAULT_SETTINGS: Settings = {
  business_name: "Agen BRILink",
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
    .select("id,business_name,opening_cash_balance,opening_bank_balance,actual_cash_balance,actual_bank_balance")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    id: data.id,
    business_name: data.business_name,
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

/** Saldo kas & rekening menurut pembukuan (semua periode) */
export async function fetchSaldo() {
  const [settings, kas, bank] = await Promise.all([
    fetchSettings(),
    supabase.from("cash_transactions").select("type,amount"),
    supabase.from("bank_transactions").select("debit,credit"),
  ]);
  if (kas.error) throw kas.error;
  if (bank.error) throw bank.error;

  const masuk = (kas.data ?? [])
    .filter((r) => r.type === "Kas Masuk")
    .reduce((a, r) => a + Number(r.amount), 0);
  const keluar = (kas.data ?? [])
    .filter((r) => r.type === "Kas Keluar")
    .reduce((a, r) => a + Number(r.amount), 0);
  const debit = (bank.data ?? []).reduce((a, r) => a + Number(r.debit), 0);
  const kredit = (bank.data ?? []).reduce((a, r) => a + Number(r.credit), 0);

  const saldoKas = settings.opening_cash_balance + masuk - keluar;
  const saldoBank = settings.opening_bank_balance + kredit - debit;

  return {
    settings,
    masuk,
    keluar,
    debit,
    kredit,
    saldoKas,
    saldoBank,
    totalDana: saldoKas + saldoBank,
    selisihKas: settings.actual_cash_balance - saldoKas,
    selisihBank: settings.actual_bank_balance - saldoBank,
  };
}
