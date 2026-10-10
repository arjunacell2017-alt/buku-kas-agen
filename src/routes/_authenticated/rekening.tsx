import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSaldo, getUserId, saveRekening, labelRekening } from "@/lib/db";
import { mutasiPerRekening } from "@/lib/aturan";
import { rupiah, rupiahMutasi, tanggalID, todayISO, parseNominal } from "@/lib/format";
import { Kpi, PageHeader, Panel, Empty, StatusBadge } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";
import { ArrowDownToLine, ArrowUpFromLine, Landmark, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/rekening")({
  head: () => pageMeta("Rekening", "Posisi dan mutasi saldo setiap rekening agen."),
  component: RekeningPage,
});

const PER_HAL = 20;

type Baris = {
  key: string;
  manualId?: string;
  tanggal: string;
  urut: string;
  account_id: string | null;
  jenis: string;
  mutasi: number;
  ket: string | null;
  saldo?: number;
};

function RekeningPage() {
  const qc = useQueryClient();
  const [pilih, setPilih] = useState<string>("");
  const [halaman, setHalaman] = useState(0);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    transaction_date: todayISO(),
    account_id: "",
    transaction_type: "Setoran",
    debit: "",
    credit: "",
    description: "",
  });
  const [aktual, setAktual] = useState<Record<string, string>>({});

  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });
  const s = saldo.data;
  const rek = s?.perRekening ?? [];

  const mutasi = useQuery({
    queryKey: ["rekening-mutasi"],
    queryFn: async () => {
      const [tx, bank] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id,transaction_date,transaction_time,created_at,transaction_type,amount,fee,fee_method,transaction_cost,cost_method,account_id,cost_account_id,description",
          ).eq("user_id", await getUserId()),
        supabase
          .from("bank_transactions")
          .select("id,transaction_date,created_at,transaction_type,debit,credit,account_id,description").eq("user_id", await getUserId()),
      ]);
      if (tx.error) throw tx.error;
      if (bank.error) throw bank.error;
      const rows: Baris[] = [];
      for (const t of tx.data ?? []) {
        mutasiPerRekening(t).forEach((p, i) =>
          rows.push({
            key: `${t.id}-${i}`,
            tanggal: t.transaction_date,
            urut: `${t.transaction_date} ${t.transaction_time} ${t.created_at}`,
            account_id: p.account_id,
            jenis: i === 0 ? t.transaction_type : `Biaya ${t.transaction_type}`,
            mutasi: p.amount,
            ket: t.description,
          }),
        );
      }
      for (const b of bank.data ?? []) {
        rows.push({
          key: b.id,
          manualId: b.id,
          tanggal: b.transaction_date,
          urut: `${b.transaction_date} 23:59:59 ${b.created_at}`,
          account_id: b.account_id,
          jenis: b.transaction_type ?? "Manual",
          mutasi: Number(b.credit) - Number(b.debit),
          ket: b.description,
        });
      }
      return rows.sort((a, b) => a.urut.localeCompare(b.urut));
    },
  });

  // Saldo berjalan per rekening (tidak dicampur antar rekening)
  const baris = useMemo(() => {
    const run = new Map(rek.map((r) => [r.id, r.opening_balance]));
    const out = (mutasi.data ?? []).map((b) => {
      const id = b.account_id ?? "";
      const nilai = (run.get(id) ?? 0) + b.mutasi;
      run.set(id, nilai);
      return { ...b, saldo: nilai };
    });
    return out.filter((b) => !pilih || b.account_id === pilih).reverse();
  }, [mutasi.data, rek, pilih]);

  const simpan = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const akun = rek.find((r) => r.id === f.account_id);
      const { error } = await supabase.from("bank_transactions").insert({
        user_id,
        account_id: f.account_id || null,
        transaction_date: f.transaction_date,
        account_name: akun?.bank_name ?? "",
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
    mutationFn: async (id: string) => {
      const r = rek.find((x) => x.id === id);
      if (!r) return;
      await saveRekening({ ...r, actual_balance: parseNominal(aktual[id] ?? "") });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const aktif = rek.find((r) => r.id === pilih);
  const kpi = aktif
    ? { awal: aktif.opening_balance, kredit: aktif.kredit, debit: aktif.debit, saldo: aktif.saldo }
    : { awal: s?.openingBank ?? 0, kredit: s?.kredit ?? 0, debit: s?.debit ?? 0, saldo: s?.saldoBank ?? 0 };
  const maksHal = Math.max(0, Math.ceil(baris.length / PER_HAL) - 1);
  const tampil = baris.slice(halaman * PER_HAL, halaman * PER_HAL + PER_HAL);
  const nama = (id: string | null) => {
    const r = rek.find((x) => x.id === id);
    return r ? labelRekening(r) : "-";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekening"
        subtitle="Posisi dan mutasi setiap rekening agen."
        action={
          <Button
            onClick={() => {
              setF({ ...f, account_id: pilih || rek.find((r) => r.status === "aktif")?.id || "" });
              setOpen(true);
            }}
          >
            <Plus /> Tambah Mutasi
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => { setPilih(""); setHalaman(0); }}
          className={`rounded-xl border p-4 text-left transition-colors ${!pilih ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/50"}`}
        >
          <p className="text-xs font-semibold uppercase text-muted-foreground">Total Saldo Rekening</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{rupiah(s?.saldoBank ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{rek.length} rekening</p>
        </button>
        {rek.map((r) => (
          <button
            key={r.id}
            onClick={() => { setPilih(r.id); setHalaman(0); }}
            className={`rounded-xl border p-4 text-left transition-colors ${pilih === r.id ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/50"}`}
          >
            <p className="text-sm font-bold text-primary">
              {r.bank_name} {r.status !== "aktif" ? <span className="text-xs text-muted-foreground">(nonaktif)</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{r.account_number ? `•••• ${r.account_number.slice(-4)}` : "—"}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{rupiah(r.saldo)}</p>
            <p className="text-xs font-medium text-primary">Lihat Mutasi →</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`Saldo Awal ${aktif ? aktif.bank_name : "Rekening"}`} value={kpi.awal} />
        <Kpi label="Total Kredit (Masuk)" value={kpi.kredit} tone="positive" icon={<ArrowDownToLine />} />
        <Kpi label="Total Debit (Keluar)" value={kpi.debit} tone="negative" icon={<ArrowUpFromLine />} />
        <Kpi label={`Saldo ${aktif ? aktif.bank_name : "Rekening"}`} value={kpi.saldo} icon={<Landmark />} prominent />
      </div>

      <Panel title="Rekonsiliasi per Rekening">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="py-2">Rekening</th>
                <th className="py-2 text-right">Pembukuan</th>
                <th className="py-2">Saldo Aktual</th>
                <th className="py-2 text-right">Selisih</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rek.map((r) => (
                <tr key={r.id} className="border-t border-border/70">
                  <td className="py-2">{labelRekening(r)}</td>
                  <td className="py-2 text-right tabular-nums">{rupiah(r.saldo)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        className={`${inputClass} max-w-40`}
                        placeholder={String(r.actual_balance)}
                        value={aktual[r.id] ?? ""}
                        onChange={(e) => setAktual({ ...aktual, [r.id]: e.target.value.replace(/[^0-9]/g, "") })}
                      />
                      <button className={btnGhost} onClick={() => simpanAktual.mutate(r.id)}>Simpan</button>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{rupiah(r.selisih)}</td>
                  <td className="py-2"><StatusBadge selisih={r.selisih} /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{rupiah(s?.saldoBank ?? 0)}</td>
                <td className="py-2 tabular-nums">{rupiah(s?.aktualBank ?? 0)}</td>
                <td className="py-2 text-right tabular-nums">{rupiah(s?.selisihBank ?? 0)}</td>
                <td className="py-2"><StatusBadge selisih={s?.selisihBank ?? 0} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`Mutasi ${aktif ? labelRekening(aktif) : "Semua Rekening"}`}>
        {tampil.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Rekening</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Mutasi</th>
                  <th className="py-2 text-right">Saldo Rekening</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((r) => (
                  <tr key={r.key} className="border-t border-border/70 hover:bg-secondary/40">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.tanggal)}</td>
                    <td className="py-2 whitespace-nowrap">{nama(r.account_id)}</td>
                    <td className="py-2">{r.jenis}</td>
                    <td className={`py-2 text-right tabular-nums ${r.mutasi < 0 ? "text-destructive" : "text-success"}`}>
                      {rupiahMutasi(r.mutasi)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.saldo ?? 0)}</td>
                    <td className="py-2 text-muted-foreground">{r.ket ?? "-"}</td>
                    <td className="py-2 text-right">
                      {r.manualId ? (
                        <Button
                          variant="ghost" size="icon" className="text-destructive" aria-label="Hapus mutasi rekening"
                          onClick={() => {
                            if (confirm("Hapus mutasi ini?")) hapus.mutate(r.manualId!);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-sm">
          <button className={btnGhost} disabled={halaman === 0} onClick={() => setHalaman((h) => Math.max(0, h - 1))}>
            Sebelumnya
          </button>
          <span className="text-xs text-muted-foreground">Halaman {halaman + 1} dari {maksHal + 1}</span>
          <button className={btnGhost} disabled={halaman >= maksHal} onClick={() => setHalaman((h) => h + 1)}>
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
            <input type="date" required className={inputClass} value={f.transaction_date}
              onChange={(e) => setF({ ...f, transaction_date: e.target.value })} />
          </Field>
          <Field label="Rekening">
            <select required className={inputClass} value={f.account_id}
              onChange={(e) => setF({ ...f, account_id: e.target.value })}>
              <option value="">Pilih rekening</option>
              {rek.filter((r) => r.status === "aktif").map((r) => (
                <option key={r.id} value={r.id}>{labelRekening(r)}</option>
              ))}
            </select>
          </Field>
          <Field label="Jenis transaksi">
            <input className={inputClass} value={f.transaction_type}
              onChange={(e) => setF({ ...f, transaction_type: e.target.value })} />
          </Field>
          <Field label="Debit (uang keluar)">
            <input inputMode="numeric" className={inputClass} value={f.debit}
              onChange={(e) => setF({ ...f, debit: e.target.value.replace(/[^0-9]/g, "") })} />
          </Field>
          <Field label="Kredit (uang masuk)">
            <input inputMode="numeric" className={inputClass} value={f.credit}
              onChange={(e) => setF({ ...f, credit: e.target.value.replace(/[^0-9]/g, "") })} />
          </Field>
          <Field label="Keterangan">
            <input className={inputClass} maxLength={200} value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Batal</button>
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>Simpan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
