import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, getUserId } from "@/lib/db";
import { rupiah, tanggalID, todayISO, parseNominal } from "@/lib/format";
import { KATEGORI_KAS } from "@/lib/konstanta";
import { Kpi, PageHeader, Panel, Empty } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => pageMeta("Kas", "Posisi dan mutasi uang kas fisik agen."),
  component: KasPage,
});

const PER_HAL = 20;

function KasPage() {
  const qc = useQueryClient();
  const [halaman, setHalaman] = useState(0);
  const [open, setOpen] = useState(false);
  const [tipe, setTipe] = useState<"Kas Masuk" | "Kas Keluar">("Kas Masuk");
  const [tanggal, setTanggal] = useState(todayISO());
  const [kategori, setKategori] = useState<string>(KATEGORI_KAS[0]);
  const [nominal, setNominal] = useState("");
  const [ket, setKet] = useState("");

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const list = useQuery({
    queryKey: ["kas", halaman],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("cash_transactions")
        .select("id,transaction_date,type,category,amount,description", { count: "exact" }).eq("user_id", await getUserId())
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(halaman * PER_HAL, halaman * PER_HAL + PER_HAL - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const simpan = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const { error } = await supabase.from("cash_transactions").insert({
        user_id,
        transaction_date: tanggal,
        type: tipe,
        category: kategori,
        amount: parseNominal(nominal),
        description: ket || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setNominal("");
      setKet("");
      qc.invalidateQueries();
    },
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const s = saldo.data;
  const maksHal = Math.max(0, Math.ceil((list.data?.count ?? 0) / PER_HAL) - 1);

  function buka(t: "Kas Masuk" | "Kas Keluar") {
    setTipe(t);
    setTanggal(todayISO());
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas"
        subtitle="Posisi dan mutasi uang kas fisik."
        action={
          <div className="flex gap-2">
            <Button onClick={() => buka("Kas Masuk")}><ArrowDownToLine /> Kas Masuk</Button>
            <Button variant="outline" onClick={() => buka("Kas Keluar")}><ArrowUpFromLine /> Kas Keluar</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Saldo Awal Kas" value={s?.settings.opening_cash_balance ?? 0} />
        <Kpi label="Total Kas Masuk" value={s?.kasMasuk ?? 0} tone="positive" icon={<ArrowDownToLine />} />
        <Kpi label="Total Kas Keluar" value={s?.kasKeluar ?? 0} tone="negative" icon={<ArrowUpFromLine />} />
        <Kpi label="Saldo Kas" value={s?.saldoKas ?? 0} icon={<Wallet />} prominent />
      </div>

      <Panel title="Riwayat Kas">
        {(list.data?.rows ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2">Kategori</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-secondary/40">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.transaction_date)}</td>
                    <td
                      className={`py-2 ${r.type === "Kas Masuk" ? "text-success" : "text-destructive"}`}
                    >
                      {r.type}
                    </td>
                    <td className="py-2">{r.category ?? "-"}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                    <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost" size="icon" className="text-destructive" aria-label="Hapus catatan kas"
                        onClick={() => {
                          if (confirm("Hapus catatan kas ini?")) hapus.mutate(r.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </td>
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
      </Panel>

      <Modal open={open} title={tipe} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate();
          }}
        >
          <Field label="Tanggal">
            <input
              type="date"
              required
              className={inputClass}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
          <Field label="Kategori">
            <select
              className={inputClass}
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {KATEGORI_KAS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nominal">
            <input
              inputMode="numeric"
              required
              className={inputClass}
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
          <Field label="Keterangan">
            <input
              className={inputClass}
              maxLength={200}
              value={ket}
              onChange={(e) => setKet(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
