import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo } from "@/lib/db";
import { rupiah, tanggalID, jamID, rangeFromPeriode, type Periode } from "@/lib/format";
import { JENIS_TRANSAKSI } from "@/lib/konstanta";
import { Kpi, Panel, PageHeader, StatusBadge, Empty } from "@/components/ui-kit";
import { inputClass } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [periode, setPeriode] = useState<Periode>("hari");
  const awal = rangeFromPeriode(periode === "custom" ? "bulan" : periode);
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to);

  function gantiPeriode(p: Periode) {
    setPeriode(p);
    if (p !== "custom") {
      const r = rangeFromPeriode(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const ringkasan = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: async () => {
      const [tx, exp] = await Promise.all([
        supabase
          .from("transactions")
          .select("transaction_type,amount,fee")
          .gte("transaction_date", from)
          .lte("transaction_date", to),
        supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", from)
          .lte("expense_date", to),
      ]);
      if (tx.error) throw tx.error;
      if (exp.error) throw exp.error;
      return { tx: tx.data ?? [], exp: exp.data ?? [] };
    },
  });

  const terbaru = useQuery({
    queryKey: ["tx-terbaru"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id,transaction_date,transaction_time,transaction_type,amount,fee,description")
        .order("transaction_date", { ascending: false })
        .order("transaction_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const agregat = useMemo(() => {
    const rows = ringkasan.data?.tx ?? [];
    const totalNilai = rows.reduce((a, r) => a + Number(r.amount), 0);
    const totalFee = rows.reduce((a, r) => a + Number(r.fee), 0);
    const totalBiaya = (ringkasan.data?.exp ?? []).reduce((a, r) => a + Number(r.amount), 0);
    const perJenis = JENIS_TRANSAKSI.map((j) => {
      const f = rows.filter((r) => r.transaction_type === j);
      return {
        jenis: j,
        jumlah: f.length,
        nominal: f.reduce((a, r) => a + Number(r.amount), 0),
        fee: f.reduce((a, r) => a + Number(r.fee), 0),
      };
    }).filter((r) => r.jumlah > 0);
    return {
      jumlah: rows.length,
      totalNilai,
      totalFee,
      totalBiaya,
      laba: totalFee - totalBiaya,
      perJenis,
    };
  }, [ringkasan.data]);

  const s = saldo.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" />

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
                onClick={() => gantiPeriode(k)}
                className={`rounded-md px-3 py-2 text-sm ${
                  periode === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total Transaksi" value={String(agregat.jumlah)} />
        <Kpi label="Total Nilai Transaksi" value={agregat.totalNilai} />
        <Kpi label="Total Fee" value={agregat.totalFee} />
        <Kpi label="Total Biaya" value={agregat.totalBiaya} />
        <Kpi
          label="Laba Bersih"
          value={agregat.laba}
          tone={agregat.laba >= 0 ? "positive" : "negative"}
        />
        <Kpi label="Saldo Kas" value={s?.saldoKas ?? 0} />
        <Kpi label="Saldo Rekening" value={s?.saldoBank ?? 0} />
        <Kpi label="Total Dana" value={s?.totalDana ?? 0} />
        <Kpi
          label="Selisih Rekonsiliasi"
          value={(s?.selisihKas ?? 0) + (s?.selisihBank ?? 0)}
          tone={
            Math.round((s?.selisihKas ?? 0) + (s?.selisihBank ?? 0)) === 0 ? "positive" : "negative"
          }
        />
      </div>

      <Panel title="Ringkasan per Jenis Transaksi">
        {agregat.perJenis.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Jumlah</th>
                  <th className="py-2 text-right">Total Nominal</th>
                  <th className="py-2 text-right">Total Fee</th>
                </tr>
              </thead>
              <tbody>
                {agregat.perJenis.map((r) => (
                  <tr key={r.jenis} className="border-t border-border">
                    <td className="py-2">{r.jenis}</td>
                    <td className="py-2 text-right tabular-nums">{r.jumlah}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.nominal)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Transaksi Terbaru">
        {(terbaru.data ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Jam</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2 text-right">Fee</th>
                  <th className="py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {(terbaru.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{tanggalID(r.transaction_date)}</td>
                    <td className="py-2">{jamID(r.transaction_time)}</td>
                    <td className="py-2">{r.transaction_type}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.fee)}</td>
                    <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Status Rekonsiliasi">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Kas</p>
              <p className="text-xs text-muted-foreground">
                Selisih {rupiah(s?.selisihKas ?? 0)}
              </p>
            </div>
            <StatusBadge selisih={s?.selisihKas ?? 0} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Rekening</p>
              <p className="text-xs text-muted-foreground">
                Selisih {rupiah(s?.selisihBank ?? 0)}
              </p>
            </div>
            <StatusBadge selisih={s?.selisihBank ?? 0} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
