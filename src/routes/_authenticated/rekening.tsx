import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, getUserId, saveSettings } from "@/lib/db";
import { rupiah, tanggalID, todayISO, parseNominal } from "@/lib/format";
import { Kpi, PageHeader, Panel, Empty, StatusBadge } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/rekening")({
  component: RekeningPage,
});

const PER_HAL = 20;

function RekeningPage() {
  const qc = useQueryClient();
  const [halaman, setHalaman] = useState(0);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    transaction_date: todayISO(),
    account_name: "BRI",
    transaction_type: "Setoran",
    debit: "",
    credit: "",
    description: "",
  });
  const [aktual, setAktual] = useState<string>("");

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });

  const list = useQuery({
    queryKey: ["rekening", halaman],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("bank_transactions")
        .select("id,transaction_date,account_name,transaction_type,debit,credit,description", {
          count: "exact",
        })
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
      const { error } = await supabase.from("bank_transactions").insert({
        user_id,
        transaction_date: f.transaction_date,
        account_name: f.account_name,
        transaction_type: f.transaction_type || null,
        debit: parseNominal(f.debit),
        credit: parseNominal(f.credit),
        description: f.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setF({ ...f, debit: "", credit: "", description: "" });
      qc.invalidateQueries();
    },
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const simpanAktual = useMutation({
    mutationFn: async () => {
      if (!saldo.data) return;
      await saveSettings({
        ...saldo.data.settings,
        actual_bank_balance: parseNominal(aktual),
      });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const s = saldo.data;
  const maksHal = Math.max(0, Math.ceil((list.data?.count ?? 0) / PER_HAL) - 1);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rekening"
        action={
          <button className={btnPrimary} onClick={() => setOpen(true)}>
            Tambah Mutasi
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Saldo Awal Rekening" value={s?.settings.opening_bank_balance ?? 0} />
        <Kpi label="Total Kredit (Masuk)" value={s?.kredit ?? 0} tone="positive" />
        <Kpi label="Total Debit (Keluar)" value={s?.debit ?? 0} tone="negative" />
        <Kpi label="Saldo Rekening" value={s?.saldoBank ?? 0} />
      </div>

      <Panel title="Rekonsiliasi Rekening">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Saldo menurut pembukuan</p>
            <p className="text-base font-semibold tabular-nums">{rupiah(s?.saldoBank ?? 0)}</p>
          </div>
          <Field label="Saldo aktual rekening">
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                className={inputClass}
                placeholder={String(s?.settings.actual_bank_balance ?? 0)}
                value={aktual}
                onChange={(e) => setAktual(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <button className={btnGhost} onClick={() => simpanAktual.mutate()}>
                Simpan
              </button>
            </div>
          </Field>
          <div>
            <p className="text-xs text-muted-foreground">Selisih</p>
            <p className="text-base font-semibold tabular-nums">{rupiah(s?.selisihBank ?? 0)}</p>
            <div className="mt-1">
              <StatusBadge selisih={s?.selisihBank ?? 0} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Mutasi Rekening">
        {(list.data?.rows ?? []).length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Rekening</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Debit</th>
                  <th className="py-2 text-right">Kredit</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.transaction_date)}</td>
                    <td className="py-2">{r.account_name}</td>
                    <td className="py-2">{r.transaction_type ?? "-"}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.debit)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.credit)}</td>
                    <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                    <td className="py-2 text-right">
                      <button
                        className="text-xs text-destructive underline"
                        onClick={() => {
                          if (confirm("Hapus mutasi ini?")) hapus.mutate(r.id);
                        }}
                      >
                        Hapus
                      </button>
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

      <Modal open={open} title="Tambah Mutasi Rekening" onClose={() => setOpen(false)}>
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
              value={f.transaction_date}
              onChange={(e) => setF({ ...f, transaction_date: e.target.value })}
            />
          </Field>
          <Field label="Nama rekening">
            <input
              required
              className={inputClass}
              value={f.account_name}
              onChange={(e) => setF({ ...f, account_name: e.target.value })}
            />
          </Field>
          <Field label="Jenis transaksi">
            <input
              className={inputClass}
              value={f.transaction_type}
              onChange={(e) => setF({ ...f, transaction_type: e.target.value })}
            />
          </Field>
          <Field label="Debit (uang keluar)">
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.debit}
              onChange={(e) => setF({ ...f, debit: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </Field>
          <Field label="Kredit (uang masuk)">
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.credit}
              onChange={(e) => setF({ ...f, credit: e.target.value.replace(/[^0-9]/g, "") })}
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
