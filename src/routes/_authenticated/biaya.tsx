import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/db";
import { rupiah, tanggalID, todayISO, parseNominal, rangeFromPeriode } from "@/lib/format";
import { KATEGORI_BIAYA } from "@/lib/konstanta";
import { Kpi, PageHeader, Panel, Empty } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/biaya")({
  head: () => pageMeta("Biaya Operasional", "Catat dan pantau biaya operasional agen."),
  component: BiayaPage,
});

function BiayaPage() {
  const qc = useQueryClient();
  const bulan = rangeFromPeriode("bulan");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    expense_date: todayISO(),
    category: KATEGORI_BIAYA[0] as string,
    amount: "",
    description: "",
  });

  const bulanIni = useQuery({
    queryKey: ["biaya-bulan", bulan.from, bulan.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("category,amount").eq("user_id", await getUserId())
        .gte("expense_date", bulan.from)
        .lte("expense_date", bulan.to);
      if (error) throw error;
      return data ?? [];
    },
  });

  const terbaru = useQuery({
    queryKey: ["biaya-terbaru"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id,expense_date,category,amount,description").eq("user_id", await getUserId())
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const simpan = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const { error } = await supabase.from("expenses").insert({
        user_id,
        expense_date: f.expense_date,
        category: f.category,
        amount: parseNominal(f.amount),
        description: f.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setF({ ...f, amount: "", description: "" });
      qc.invalidateQueries();
    },
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const perKategori = useMemo(() => {
    const rows = bulanIni.data ?? [];
    return KATEGORI_BIAYA.map((k) => ({
      kategori: k,
      total: rows.filter((r) => r.category === k).reduce((a, r) => a + Number(r.amount), 0),
    })).filter((r) => r.total > 0);
  }, [bulanIni.data]);

  const totalBulan = (bulanIni.data ?? []).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biaya Operasional"
        subtitle="Pantau pengeluaran operasional agen."
        action={
          <Button onClick={() => setOpen(true)}><Plus /> Tambah Biaya</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total Biaya Bulan Ini" value={totalBulan} tone="negative" icon={<ReceiptText />} prominent />
        <Kpi label="Jumlah Catatan" value={String((bulanIni.data ?? []).length)} />
      </div>

      <Panel title="Biaya per Kategori (bulan berjalan)">
        {perKategori.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {perKategori.map((r) => (
                <tr key={r.kategori} className="border-t border-border/70 first:border-t-0 hover:bg-secondary/40">
                  <td className="py-2">{r.kategori}</td>
                  <td className="py-2 text-right tabular-nums">{rupiah(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Biaya Terbaru">
        {(terbaru.data ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Kategori</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(terbaru.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-secondary/40">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.expense_date)}</td>
                    <td className="py-2">{r.category}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                    <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost" size="icon" className="text-destructive" aria-label="Hapus biaya"
                        onClick={() => {
                          if (confirm("Hapus biaya ini?")) hapus.mutate(r.id);
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
      </Panel>

      <Modal open={open} title="Tambah Biaya Operasional" onClose={() => setOpen(false)}>
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
              value={f.expense_date}
              onChange={(e) => setF({ ...f, expense_date: e.target.value })}
            />
          </Field>
          <Field label="Kategori">
            <select
              className={inputClass}
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {KATEGORI_BIAYA.map((k) => (
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
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </Field>
          <Field label="Keterangan">
            <input
              className={inputClass}
              maxLength={200}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
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
