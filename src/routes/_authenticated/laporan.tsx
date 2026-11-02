import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, fetchRingkasan, labelRekening, getUserId } from "@/lib/db";
import { rupiah, tanggalID, rangeFromPeriode, type Periode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { FilterPeriode } from "@/components/FilterPeriode";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () =>
    pageMeta("Laporan Keuangan", "Ringkasan transaksi, laba rugi, arus kas, dan rekonsiliasi."),
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
  const awal = rangeFromPeriode("bulan");
  const [periode, setPeriode] = useState<Periode>("custom");
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to);

  const [akun, setAkun] = useState("");
  const [halaman, setHalaman] = useState(0);
  const detail = useQuery({
    queryKey: ["laporan-transaksi-detail", from, to, akun, halaman],
    queryFn: async () => {
      let q = supabase.from("transactions")
        .select("id,transaction_number,transaction_date,transaction_type,amount,fee", { count: "exact" })
        .eq("user_id", await getUserId())
        .gte("transaction_date", from).lte("transaction_date", to)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(halaman * 20, halaman * 20 + 19);
      if (akun) q = q.eq("account_id", akun);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const ringkasan = useQuery({
    queryKey: ["ringkasan", from, to, akun],
    queryFn: () => fetchRingkasan(from, to, akun || undefined),
  });

  const arus = useQuery({
    queryKey: ["arus-kas", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("type,amount,transaction_date")
        .eq("user_id", await getUserId())
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
    <div className="space-y-6">
      <PageHeader
        title="Laporan Keuangan"
        subtitle="Ringkasan pembukuan untuk periode yang dipilih."
      />

      <FilterPeriode
        periode={periode}
        from={from}
        to={to}
        onChange={(p, f, t) => {
          setHalaman(0);
          setPeriode(p);
          setFrom(f);
          setTo(t);
        }}
      />

      <select
        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
        value={akun}
        onChange={(e) => { setAkun(e.target.value); setHalaman(0); }}
        aria-label="Filter rekening"
      >
        <option value="">Semua Rekening</option>
        {(saldo.data?.perRekening ?? []).map((x) => (
          <option key={x.id} value={x.id}>
            {labelRekening(x)}
          </option>
        ))}
      </select>
      {akun ? (
        <p className="text-xs text-muted-foreground">
          Laporan A–C hanya transaksi rekening terpilih; biaya operasional tidak terikat rekening
          sehingga tidak dihitung.
        </p>
      ) : null}

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
            {(s?.perRekening ?? [])
              .filter((x) => !akun || x.id === akun)
              .map((x) => (
                <Baris
                  key={x.id}
                  label={`${labelRekening(x)}: ${rupiah(x.saldo)} vs ${rupiah(x.actual_balance)}`}
                  value={rupiah(x.selisih)}
                />
              ))}
            <Baris label="Rekening pembukuan" value={rupiah(s?.saldoBank ?? 0)} />
            <Baris label="Saldo aktual" value={rupiah(s?.aktualBank ?? 0)} />
            <Baris label="Selisih" value={rupiah(s?.selisihBank ?? 0)} bold />
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihBank ?? 0} />
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Rincian Transaksi">
        {detail.isError ? <p className="text-sm text-destructive">Rincian transaksi belum dapat dimuat.</p> :
          detail.isPending ? <p className="text-sm text-muted-foreground">Memuat…</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">Tanggal</th><th className="py-2">Nomor Transaksi</th>
                    <th className="py-2">Jenis</th><th className="py-2 text-right">Nominal</th>
                    <th className="py-2 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.rows.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-2 whitespace-nowrap">{tanggalID(t.transaction_date)}</td>
                      <td className="py-2 whitespace-nowrap tabular-nums">{t.transaction_number ?? "-"}</td>
                      <td className="py-2 whitespace-nowrap">{t.transaction_type}</td>
                      <td className="py-2 text-right tabular-nums">{rupiah(t.amount)}</td>
                      <td className="py-2 text-right tabular-nums">{rupiah(t.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.data.count === 0 ? <p className="py-3 text-sm text-muted-foreground">Tidak ada transaksi.</p> : null}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={halaman === 0} onClick={() => setHalaman(h => h - 1)}>Sebelumnya</Button>
              <span className="text-xs text-muted-foreground">Halaman {halaman + 1} dari {Math.max(1, Math.ceil(detail.data.count / 20))}</span>
              <Button variant="outline" size="sm" disabled={(halaman + 1) * 20 >= detail.data.count} onClick={() => setHalaman(h => h + 1)}>Berikutnya</Button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
