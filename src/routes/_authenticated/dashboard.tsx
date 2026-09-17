import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, fetchRingkasan } from "@/lib/db";
import { rupiah, tanggalID, jamID, rangeFromPeriode, type Periode } from "@/lib/format";
import { Kpi, Panel, PageHeader, StatusBadge, Empty } from "@/components/ui-kit";
import { FilterPeriode } from "@/components/FilterPeriode";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
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

function Dashboard() {
  const [periode, setPeriode] = useState<Periode>("hari");
  const awal = rangeFromPeriode("hari");
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to);

  const ringkasan = useQuery({
    queryKey: ["ringkasan", from, to],
    queryFn: () => fetchRingkasan(from, to),
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

  const s = saldo.data;
  const r = ringkasan.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" />

      <FilterPeriode
        periode={periode}
        from={from}
        to={to}
        onChange={(p, f, t) => {
          setPeriode(p);
          setFrom(f);
          setTo(t);
        }}
      />

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Posisi Dana (seluruh periode)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Kpi label="Saldo Rekening" value={s?.saldoBank ?? 0} />
          <Kpi label="Uang Kas" value={s?.saldoKas ?? 0} />
          <Kpi label="Total Dana" value={s?.totalDana ?? 0} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pendapatan & Laba ({tanggalID(from)} – {tanggalID(to)})
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Total Transaksi" value={String(r?.jumlah ?? 0)} />
          <Kpi label="Total Nilai Transaksi" value={r?.totalNominal ?? 0} />
          <Kpi label="Total Fee" value={r?.totalFee ?? 0} />
          <Kpi label="Fee Tunai" value={r?.feeTunai ?? 0} />
          <Kpi label="Fee Saldo" value={r?.feeSaldo ?? 0} />
          <Kpi
            label="Total Biaya"
            value={r?.totalBiaya ?? 0}
            tone={(r?.totalBiaya ?? 0) > 0 ? "negative" : "default"}
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Kpi
            label="Laba Bersih"
            value={r?.laba ?? 0}
            tone={(r?.laba ?? 0) >= 0 ? "positive" : "negative"}
          />
          <Kpi label="Biaya Transaksi" value={r?.biayaTransaksi ?? 0} />
          <Kpi label="Biaya Operasional" value={r?.biayaOperasional ?? 0} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rekonsiliasi Kas">
          <Baris label="Kas pembukuan" value={rupiah(s?.saldoKas ?? 0)} />
          <Baris label="Kas fisik aktual" value={rupiah(s?.settings.actual_cash_balance ?? 0)} />
          <Baris label="Selisih kas" value={rupiah(s?.selisihKas ?? 0)} bold />
          <div className="pt-2">
            <StatusBadge selisih={s?.selisihKas ?? 0} />
          </div>
        </Panel>
        <Panel title="Rekonsiliasi Rekening">
          <Baris label="Rekening pembukuan" value={rupiah(s?.saldoBank ?? 0)} />
          <Baris
            label="Saldo rekening aktual"
            value={rupiah(s?.settings.actual_bank_balance ?? 0)}
          />
          <Baris label="Selisih rekening" value={rupiah(s?.selisihBank ?? 0)} bold />
          <div className="pt-2">
            <StatusBadge selisih={s?.selisihBank ?? 0} />
          </div>
        </Panel>
      </div>

      <Panel title="Ringkasan per Jenis Transaksi">
        {(r?.perJenis ?? []).length === 0 ? (
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
                {(r?.perJenis ?? []).map((x) => (
                  <tr key={x.jenis} className="border-t border-border">
                    <td className="py-2">{x.jenis}</td>
                    <td className="py-2 text-right tabular-nums">{x.jumlah}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(x.nominal)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(x.fee)}</td>
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
                {(terbaru.data ?? []).map((x) => (
                  <tr key={x.id} className="border-t border-border">
                    <td className="py-2">{tanggalID(x.transaction_date)}</td>
                    <td className="py-2">{jamID(x.transaction_time)}</td>
                    <td className="py-2">{x.transaction_type}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(x.amount)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(x.fee)}</td>
                    <td className="py-2 text-muted-foreground">{x.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
