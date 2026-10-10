import { supabase } from "@/integrations/supabase/client";
import { hitungMutasi } from "@/lib/aturan";
import { hitungStatus, type StatusAkses } from "@/lib/akses";

export type ClientRow = {
  user_id: string;
  agent_name: string;
  owner_name: string;
  email: string;
  phone: string;
  agent_type: string;
  active_from: string;
  active_until: string;
  suspended: boolean;
  created_at: string;
  status: StatusAkses;
};

export const clientsQuery = {
  queryKey: ["admin", "clients"],
  queryFn: async (): Promise<ClientRow[]> => {
    const { data, error } = await supabase.from("client_profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p) => ({ ...p, status: hitungStatus(p) }));
  },
};

export async function ringkasanClient(userId: string) {
  const [tx, kas, bank, exp, set, akun] = await Promise.all([
    supabase.from("transactions").select("transaction_type,amount,fee,fee_method,transaction_cost,cost_method").eq("user_id", userId),
    supabase.from("cash_transactions").select("type,amount").eq("user_id", userId),
    supabase.from("bank_transactions").select("debit,credit").eq("user_id", userId),
    supabase.from("expenses").select("amount").eq("user_id", userId),
    supabase.from("account_settings").select("opening_cash_balance,opening_bank_balance").eq("user_id", userId).maybeSingle(),
    supabase.from("bank_accounts").select("opening_balance").eq("user_id", userId),
  ]);
  let rek = (akun.data ?? []).reduce((a, r) => a + Number(r.opening_balance), 0);
  let cash = Number(set.data?.opening_cash_balance ?? 0);
  let fee = 0;
  let biayaTx = 0;
  for (const t of tx.data ?? []) {
    const m = hitungMutasi({ ...t, amount: Number(t.amount), fee: Number(t.fee), transaction_cost: Number(t.transaction_cost) });
    rek += m.mutasiRekening;
    cash += m.mutasiKas;
    fee += m.pendapatanFee;
    biayaTx += m.biaya;
  }
  for (const c of kas.data ?? []) cash += (c.type === "Kas Masuk" ? 1 : -1) * Number(c.amount);
  for (const b of bank.data ?? []) rek += Number(b.credit) - Number(b.debit);
  const biaya = biayaTx + (exp.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  return {
    saldoRekening: rek,
    saldoKas: cash,
    totalDana: rek + cash,
    totalFee: fee,
    totalBiaya: biaya,
    labaBersih: fee - biaya,
    jumlahTransaksi: (tx.data ?? []).length,
  };
}
