import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Landmark, Plus, Receipt, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, fetchRingkasan } from "@/lib/db";
import { rupiah, rupiahMutasi, tanggalID, jamID, rangeFromPeriode, type Periode } from "@/lib/format";
import { hitungMutasi } from "@/lib/aturan";
import { Kpi, Panel, PageHeader, StatusBadge, Empty, SectionHeading, tableCellClass, tableHeadClass, tableRowClass } from "@/components/ui-kit";
import { FilterPeriode } from "@/components/FilterPeriode";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => pageMeta("Dashboard", "Ringkasan saldo, pendapatan, biaya, dan rekonsiliasi Agen BRILink."),
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
  const navigate = useNavigate();
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
          "id,transaction_date,transaction_time,transaction_type,amount,fee,fee_method,transaction_cost,cost_method,description")
        .order("transaction_date", { ascending: false })
        .order("transaction_time", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const s = saldo.data;
  const r = ringkasan.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Keuangan"
        subtitle="Pantau posisi dana dan aktivitas AgenBRILink Anda."
        action={<Button onClick={() => navigate({ to: "/transaksi" })}><Plus /> Tambah Transaksi</Button>}
      />

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

      <div className="space-y-3">
        <SectionHeading title="Posisi Dana" description="Saldo berjalan dari seluruh mutasi pembukuan." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="Saldo Rekening" value={s?.saldoBank ?? 0} icon={<Landmark className="size-4" />} prominent />
          <Kpi label="Uang Kas" value={s?.saldoKas ?? 0} icon={<Wallet className="size-4" />} prominent />
          <div className="rounded-xl border border-primary bg-primary p-5 text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase opacity-80">Total Dana</p><TrendingUp className="size-5" /></div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{rupiah(s?.totalDana ?? 0)}</p>
            <p className="mt-3 text-xs opacity-75">Kas + saldo rekening</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeading title="Pendapatan & Biaya" description={`${tanggalID(from)} – ${tanggalID(to)}`} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Total Fee" value={r?.totalFee ?? 0} tone="positive" />
          <Kpi label="Fee Tunai" value={r?.feeTunai ?? 0} />
          <Kpi label="Fee Saldo" value={r?.feeSaldo ?? 0} />
          <Kpi label="Total Biaya" value={r?.totalBiaya ?? 0} tone="negative" />
          <Kpi label="Laba Bersih" value={r?.laba ?? 0} tone={(r?.laba ?? 0) >= 0 ? "positive" : "negative"} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeading title="Status Rekonsiliasi" description="Bandingkan saldo pembukuan dengan saldo aktual." />
        <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Kas">
          <Baris label="Kas pembukuan" value={rupiah(s?.saldoKas ?? 0)} />
          <Baris label="Kas fisik aktual" value={rupiah(s?.settings.actual_cash_balance ?? 0)} />
          <Baris label="Selisih kas" value={rupiah(s?.selisihKas ?? 0)} bold />
          <div className="pt-2">
            <StatusBadge selisih={s?.selisihKas ?? 0} />
          </div>
        </Panel>
        <Panel title="Rekening">
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
      </div>

      <Panel title="Ringkasan per Jenis Transaksi">
        {(r?.perJenis ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className={tableCellClass}>Jenis</th>
                  <th className={`${tableCellClass} text-right`}>Jumlah</th>
                  <th className={`${tableCellClass} text-right`}>Total Nominal</th>
                  <th className={`${tableCellClass} text-right`}>Total Fee</th>
                </tr>
              </thead>
              <tbody>
                {(r?.perJenis ?? []).map((x) => (
                  <tr key={x.jenis} className={tableRowClass}>
                    <td className={tableCellClass}><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{x.jenis}</span></td>
                    <td className={`${tableCellClass} text-right`}>{x.jumlah}</td>
                    <td className={`${tableCellClass} text-right`}>{rupiah(x.nominal)}</td>
                    <td className={`${tableCellClass} text-right text-success`}>{rupiah(x.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Transaksi Terbaru">
        {(terbaru.data ?? []).length === 0 ? (
          <Empty text="Belum ada transaksi" description="Mulai catat transaksi AgenBRILink Anda." action={<Button onClick={() => navigate({ to: "/transaksi" })}><Receipt /> Tambah Transaksi</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className={tableCellClass}>Tanggal</th>
                  <th className={tableCellClass}>Jenis</th>
                  <th className={`${tableCellClass} text-right`}>Nominal</th>
                  <th className={`${tableCellClass} text-right`}>Fee</th>
                  <th className={`${tableCellClass} text-right`}>Mutasi Rekening</th>
                  <th className={`${tableCellClass} text-right`}>Mutasi Kas</th>
                </tr>
              </thead>
              <tbody>
                {(terbaru.data ?? []).map((x) => { const m = hitungMutasi(x); return (
                  <tr key={x.id} className={tableRowClass}>
                    <td className={tableCellClass}><p className="whitespace-nowrap font-medium">{tanggalID(x.transaction_date)}</p><p className="text-xs text-muted-foreground">{jamID(x.transaction_time)}</p></td>
                    <td className={tableCellClass}><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{x.transaction_type}</span></td>
                    <td className={`${tableCellClass} text-right font-semibold`}>{rupiah(x.amount)}</td>
                    <td className={`${tableCellClass} text-right text-success`}>{rupiah(x.fee)}</td>
                    <td className={`${tableCellClass} text-right font-semibold ${m.mutasiRekening < 0 ? "text-destructive" : "text-success"}`}>{rupiahMutasi(m.mutasiRekening)}</td>
                    <td className={`${tableCellClass} text-right font-semibold ${m.mutasiKas < 0 ? "text-destructive" : "text-success"}`}>{rupiahMutasi(m.mutasiKas)}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" asChild><Link to="/transaksi">Lihat Semua <ArrowRight /></Link></Button></div>
      </Panel>
    </div>
  );
}
