import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo } from "@/lib/db";
import { rupiah, rangeFromPeriode, type Periode } from "@/lib/format";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { inputClass } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/laporan")({
  component: LaporanPage,
});

function Baris({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-t border-border py-2 text-sm first:border-t-0 ${
        bold ? "font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function LaporanPage() {
  const [periode, setPeriode] = useState<Periode>("bulan");
  const awal = rangeFromPeriode("bulan");
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to);

  function ganti(p: Periode) {
    setPeriode(p);
    if (p !== "custom") {
      const r = rangeFromPeriode(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const data = useQuery({
    queryKey: ["laporan", from, to],
    queryFn: async () => {
      const [tx, exp, kas] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount,fee")
          .gte("transaction_date", from)
          .lte("transaction_date", to),
        supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
        supabase
          .from("cash_transactions")
          .select("type,amount,transaction_date")
          .lte("transaction_date", to),
      ]);
      if (tx.error) throw tx.error;
      if (exp.error) throw exp.error;
      if (kas.error) throw kas.error;
      return { tx: tx.data ?? [], exp: exp.data ?? [], kas: kas.data ?? [] };
    },
  });

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const tx = data.data?.tx ?? [];
  const totalNilai = tx.reduce((a, r) => a + Number(r.amount), 0);
  const totalFee = tx.reduce((a, r) => a + Number(r.fee), 0);
  const totalBiaya = (data.data?.exp ?? []).reduce((a, r) => a + Number(r.amount), 0);

  const kasSemua = data.data?.kas ?? [];
  const sum = (rows: typeof kasSemua, tipe: string) =>
    rows.filter((r) => r.type === tipe).reduce((a, r) => a + Number(r.amount), 0);
  const sebelum = kasSemua.filter((r) => r.transaction_date < from);
  const periodeRows = kasSemua.filter((r) => r.transaction_date >= from);
  const opening = saldo.data?.settings.opening_cash_balance ?? 0;
  const saldoAwal = opening + sum(sebelum, "Kas Masuk") - sum(sebelum, "Kas Keluar");
  const masuk = sum(periodeRows, "Kas Masuk");
  const keluar = sum(periodeRows, "Kas Keluar");

  const s = saldo.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Laporan" />

      <Panel>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1">
            {(
              [
                ["hari", "Hari Ini"],
                ["minggu", "Minggu Ini"],
                ["bulan", "Bulan Ini"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => ganti(k)}
                className={`rounded-md px-3 py-2 text-sm ${
                  periode === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPeriode("custom");
              setFrom(e.target.value);
            }}
            className={`${inputClass} w-40`}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPeriode("custom");
              setTo(e.target.value);
            }}
            className={`${inputClass} w-40`}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="A. Laporan Transaksi">
          <Baris label="Jumlah transaksi" value={String(tx.length)} />
          <Baris label="Total nominal" value={rupiah(totalNilai)} />
          <Baris label="Total fee" value={rupiah(totalFee)} />
        </Panel>

        <Panel title="B. Laba Rugi Sederhana">
          <Baris label="Pendapatan — Total Fee" value={rupiah(totalFee)} />
          <Baris label="Beban — Biaya Operasional" value={rupiah(totalBiaya)} />
          <Baris label="Laba Bersih" value={rupiah(totalFee - totalBiaya)} bold />
        </Panel>

        <Panel title="C. Arus Kas">
          <Baris label="Saldo awal" value={rupiah(saldoAwal)} />
          <Baris label="Kas masuk" value={rupiah(masuk)} />
          <Baris label="Kas keluar" value={rupiah(keluar)} />
          <Baris label="Saldo akhir" value={rupiah(saldoAwal + masuk - keluar)} bold />
        </Panel>

        <Panel title="D. Rekonsiliasi">
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">KAS</p>
            <Baris label="Saldo pembukuan" value={rupiah(s?.saldoKas ?? 0)} />
            <Baris label="Saldo aktual" value={rupiah(s?.settings.actual_cash_balance ?? 0)} />
            <Baris label="Selisih" value={rupiah(s?.selisihKas ?? 0)} bold />
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihKas ?? 0} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">REKENING</p>
            <Baris label="Saldo pembukuan" value={rupiah(s?.saldoBank ?? 0)} />
            <Baris label="Saldo aktual" value={rupiah(s?.settings.actual_bank_balance ?? 0)} />
            <Baris label="Selisih" value={rupiah(s?.selisihBank ?? 0)} bold />
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihBank ?? 0} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
