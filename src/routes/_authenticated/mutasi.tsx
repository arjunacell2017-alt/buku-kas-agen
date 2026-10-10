import { getUserId } from "@/lib/db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rupiah, rupiahMutasi, tanggalID, jamID } from "@/lib/format";
import { PageHeader, Panel, Empty } from "@/components/ui-kit";
import { btnGhost } from "@/components/Modal";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/mutasi")({
  head: () => pageMeta("Mutasi Dana", "Riwayat mutasi rekening dan kas beserta saldo berjalan."),
  component: MutasiPage,
});

const PER_HAL = 20;

function MutasiPage() {
  const [halaman, setHalaman] = useState(0);

  const list = useQuery({
    queryKey: ["mutasi", halaman],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("ledger_view")
        .select(
          "transaction_id,transaction_date,transaction_time,transaction_type,amount,fee,fee_method,transaction_cost,cost_method,mutasi_rekening,mutasi_kas,saldo_rekening,saldo_kas,description",
          { count: "exact" },
        ).eq("user_id", await getUserId())
        .order("transaction_date", { ascending: false })
        .order("transaction_time", { ascending: false })
        .range(halaman * PER_HAL, halaman * PER_HAL + PER_HAL - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const total = list.data?.count ?? 0;
  const maksHal = Math.max(0, Math.ceil(total / PER_HAL) - 1);
  const warna = (n: number) => (n < 0 ? "text-destructive" : "text-success");

  return (
    <div className="space-y-6">
      <PageHeader title="Mutasi Dana" subtitle="Pantau seluruh pergerakan rekening dan kas." />
      <Panel title={`Buku Mutasi (${total})`}>
        {(list.data?.rows ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Jam</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2 text-right">Fee</th>
                  <th className="py-2">Fee via</th>
                  <th className="py-2 text-right">Mutasi Rekening</th>
                  <th className="py-2 text-right">Mutasi Kas</th>
                  <th className="py-2 text-right">Saldo Rekening</th>
                  <th className="py-2 text-right">Saldo Kas</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((r) => (
                  <tr key={r.transaction_id} className="border-t border-border/70 hover:bg-secondary/40">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.transaction_date)}</td>
                    <td className="py-2">{jamID(r.transaction_time)}</td>
                    <td className="py-2 whitespace-nowrap"><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{r.transaction_type}</span></td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.fee)}</td>
                    <td className="py-2">{r.fee_method}</td>
                    <td
                      className={`py-2 text-right tabular-nums ${warna(Number(r.mutasi_rekening))}`}
                    >
                      {rupiahMutasi(Number(r.mutasi_rekening))}
                    </td>
                    <td className={`py-2 text-right tabular-nums ${warna(Number(r.mutasi_kas))}`}>
                      {rupiahMutasi(Number(r.mutasi_kas))}
                    </td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.saldo_rekening)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.saldo_kas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            className={btnGhost}
            disabled={halaman === 0}
            onClick={() => setHalaman((h) => Math.max(0, h - 1))}
          >
            Sebelumnya
          </button>
          <span className="text-xs text-muted-foreground">
            Halaman {halaman + 1} dari {maksHal + 1}
          </span>
          <button
            className={btnGhost}
            disabled={halaman >= maksHal}
            onClick={() => setHalaman((h) => h + 1)}
          >
            Berikutnya
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Saldo berjalan dihitung dari saldo awal ditambah seluruh mutasi transaksi, diurutkan
          menurut tanggal dan jam.
        </p>
      </Panel>
    </div>
  );
}
