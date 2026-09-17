import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, fetchRingkasan } from "@/lib/db";
import { rupiah, rangeFromPeriode, type Periode } from "@/lib/format";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { FilterPeriode } from "@/components/FilterPeriode";

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

  const ringkasan = useQuery({
    queryKey: ["ringkasan", from, to],
    queryFn: () => fetchRingkasan(from, to),
  });

  const arus = useQuery({
    queryKey: ["arus-kas", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("type,amount,transaction_date")
        .lte("transaction_date", to);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const kasSemua = arus.data ?? [];
  const sum = (rows: typeof kasSemua, tipe: string) =>
    rows.filter((x) => x.type === tipe).reduce((a, x) => a + Number(x.amount), 0);
  const sebelum = kasSemua.filter((x) => x.transaction_date < from);
  const periodeRows = kasSemua.filter((x) => x.transaction_date >= from);
  const opening = saldo.data?.settings.opening_cash_balance ?? 0;
  const saldoAwal = opening + sum(sebelum, "Kas Masuk") - sum(sebelum, "Kas Keluar");
  const masuk = sum(periodeRows, "Kas Masuk");
  const keluar = sum(periodeRows, "Kas Keluar");

  const r = ringkasan.data;
  const s = saldo.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Laporan" />

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="A. Laporan Transaksi">
          <Baris label="Jumlah transaksi" value={String(r?.jumlah ?? 0)} />
          <Baris label="Total nominal" value={rupiah(r?.totalNominal ?? 0)} />
          <Baris label="Total fee" value={rupiah(r?.totalFee ?? 0)} />
          <Baris label="Total biaya" value={rupiah(r?.totalBiaya ?? 0)} />
          <Baris label="Laba bersih" value={rupiah(r?.laba ?? 0)} bold />
        </Panel>

        <Panel title="B. Laporan Fee">
          <Baris label="Fee tunai (masuk kas)" value={rupiah(r?.feeTunai ?? 0)} />
          <Baris label="Fee saldo (masuk rekening)" value={rupiah(r?.feeSaldo ?? 0)} />
          <Baris label="Total fee" value={rupiah(r?.totalFee ?? 0)} bold />
        </Panel>

        <Panel title="C. Laba Rugi Sederhana">
          <Baris label="Pendapatan — total fee" value={rupiah(r?.totalFee ?? 0)} />
          <Baris label="Beban — biaya transaksi" value={rupiah(r?.biayaTransaksi ?? 0)} />
          <Baris label="Beban — biaya operasional" value={rupiah(r?.biayaOperasional ?? 0)} />
          <Baris label="Laba bersih" value={rupiah(r?.laba ?? 0)} bold />
        </Panel>

        <Panel title="D. Arus Kas (catatan kas manual)">
          <Baris label="Saldo awal" value={rupiah(saldoAwal)} />
          <Baris label="Kas masuk" value={rupiah(masuk)} />
          <Baris label="Kas keluar" value={rupiah(keluar)} />
          <Baris label="Saldo akhir" value={rupiah(saldoAwal + masuk - keluar)} bold />
        </Panel>

        <Panel title="E. Rekonsiliasi">
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">KAS</p>
            <Baris label="Kas pembukuan" value={rupiah(s?.saldoKas ?? 0)} />
            <Baris label="Kas fisik aktual" value={rupiah(s?.settings.actual_cash_balance ?? 0)} />
            <Baris label="Selisih" value={rupiah(s?.selisihKas ?? 0)} bold />
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihKas ?? 0} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">REKENING</p>
            <Baris label="Rekening pembukuan" value={rupiah(s?.saldoBank ?? 0)} />
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
