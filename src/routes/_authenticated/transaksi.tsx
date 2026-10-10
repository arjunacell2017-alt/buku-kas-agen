import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, rekeningQuery, labelRekening } from "@/lib/db";
import { hitungMutasi } from "@/lib/aturan";
import {
  rupiah,
  rupiahMutasi,
  tanggalID,
  jamID,
  todayISO,
  nowTime,
  parseNominal,
} from "@/lib/format";
import {
  JENIS_TRANSAKSI,
  METODE_PEMBAYARAN,
  METODE_FEE,
  METODE_BIAYA,
} from "@/lib/konstanta";
import { PageHeader, Panel, Empty } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/transaksi")({
  head: () => pageMeta("Transaksi", "Kelola transaksi dan mutasi dana agen."),
  component: TransaksiPage,
});

const PER_HAL = 20;

type Form = {
  id?: string;
  transaction_date: string;
  transaction_time: string;
  transaction_number: string;
  transaction_type: string;
  amount: string;
  fee: string;
  fee_method: string;
  transaction_cost: string;
  cost_method: string;
  payment_method: string;
  description: string;
  account_id: string;
  cost_account_id: string;
};

const kosong = (): Form => ({
  transaction_date: todayISO(),
  transaction_time: nowTime(),
  transaction_number: "",
  transaction_type: "Tarik Tunai",
  amount: "",
  fee: "",
  fee_method: "Tunai",
  transaction_cost: "",
  cost_method: "Tidak Ada",
  payment_method: "Tunai",
  description: "",
  account_id: "",
  cost_account_id: "",
});

function TransaksiPage() {
  const qc = useQueryClient();
  const [halaman, setHalaman] = useState(0);
  const [cari, setCari] = useState("");
  const [jenis, setJenis] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(kosong());
  const rekQ = useQuery(rekeningQuery);
  const rekAktif = (rekQ.data ?? []).filter((x) => x.status === "aktif");
  const namaRek = (id: string | null) => {
    const x = (rekQ.data ?? []).find((a) => a.id === id);
    return x ? labelRekening(x) : "-";
  };
  const bukaBaru = () => {
    const def = rekAktif.length === 1 ? (rekAktif[0]?.id ?? "") : "";
    setForm({ ...kosong(), account_id: def, cost_account_id: def });
    setOpen(true);
  };

  const list = useQuery({
    queryKey: ["transaksi", halaman, cari, jenis, dari, sampai],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select(
          "id,transaction_date,transaction_time,transaction_number,transaction_type,amount,fee,fee_method,transaction_cost,cost_method,payment_method,description,account_id,cost_account_id",
          { count: "exact" },
        ).eq("user_id", await getUserId())
        .order("transaction_date", { ascending: false })
        .order("transaction_time", { ascending: false })
        .range(halaman * PER_HAL, halaman * PER_HAL + PER_HAL - 1);
      if (jenis) q = q.eq("transaction_type", jenis);
      if (dari) q = q.gte("transaction_date", dari);
      if (sampai) q = q.lte("transaction_date", sampai);
      if (cari.trim())
        q = q.or(`description.ilike.%${cari.trim()}%,transaction_number.ilike.%${cari.trim()}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const simpan = useMutation({
    mutationFn: async (f: Form) => {
      const feeMasuk = f.transaction_type === "Fee Masuk";
      if (feeMasuk) f = { ...f, fee: "0", fee_method: "Saldo", transaction_cost: "0", cost_method: "Tidak Ada", payment_method: "Rekening" };
      const payload = {
        transaction_date: f.transaction_date,
        transaction_time: f.transaction_time || "00:00",
        transaction_number: f.transaction_number || null,
        transaction_type: f.transaction_type,
        amount: parseNominal(f.amount),
        fee: parseNominal(f.fee),
        fee_method: f.fee_method,
        transaction_cost: f.cost_method === "Tidak Ada" ? 0 : parseNominal(f.transaction_cost),
        cost_method: f.cost_method,
        payment_method: f.payment_method,
        description: f.description || null,
        account_id: f.account_id || null,
        cost_account_id: f.cost_method === "Saldo" ? f.cost_account_id || f.account_id || null : null,
      };
      if (rekAktif.length > 0 && !f.account_id) throw new Error("Pilih rekening transaksi");
      if (f.id) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const user_id = await getUserId();
        const { error } = await supabase.from("transactions").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries();
    },
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const total = list.data?.count ?? 0;
  const maksHal = Math.max(0, Math.ceil(total / PER_HAL) - 1);

  // Pratinjau dampak transaksi pada form yang sedang diisi
  const pratinjau = hitungMutasi({
    transaction_type: form.transaction_type,
    amount: parseNominal(form.amount),
    fee: parseNominal(form.fee),
    fee_method: form.fee_method,
    transaction_cost: form.cost_method === "Tidak Ada" ? 0 : parseNominal(form.transaction_cost),
    cost_method: form.cost_method,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaksi"
        subtitle="Kelola seluruh transaksi agen."
        action={
          <Button
            onClick={bukaBaru}
          >
            <Plus /> Tambah Transaksi
          </Button>
        }
      />

      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input
            placeholder="Cari keterangan / no. transaksi"
            value={cari}
            onChange={(e) => {
              setHalaman(0);
              setCari(e.target.value);
            }}
            className={`${inputClass} pl-9`}
          /></div>
          <select
            value={jenis}
            onChange={(e) => {
              setHalaman(0);
              setJenis(e.target.value);
            }}
            className={inputClass}
          >
            <option value="">Semua jenis</option>
            {JENIS_TRANSAKSI.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dari}
            onChange={(e) => {
              setHalaman(0);
              setDari(e.target.value);
            }}
            className={inputClass}
          />
          <input
            type="date"
            value={sampai}
            onChange={(e) => {
              setHalaman(0);
              setSampai(e.target.value);
            }}
            className={inputClass}
          />
        </div>
      </Panel>

      <Panel title={`Daftar Transaksi (${total})`}>
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
                  <th className="py-2">Rekening</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2 text-right">Fee</th>
                  <th className="py-2">Fee via</th>
                  <th className="py-2 text-right">Mutasi Rekening</th>
                  <th className="py-2 text-right">Mutasi Kas</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((r) => {
                  const m = hitungMutasi(r);
                  return (
                    <tr key={r.id} className="border-t border-border/70 hover:bg-secondary/40">
                      <td className="py-2 whitespace-nowrap">{tanggalID(r.transaction_date)}</td>
                      <td className="py-2">{jamID(r.transaction_time)}</td>
                       <td className="py-2 whitespace-nowrap"><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{r.transaction_type}</span></td>
                      <td className="py-2 whitespace-nowrap">{namaRek(r.account_id)}</td>
                      <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                      <td className="py-2 text-right tabular-nums">{rupiah(r.fee)}</td>
                      <td className="py-2">{r.fee_method}</td>
                      <td
                        className={`py-2 text-right tabular-nums ${m.mutasiRekening < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {rupiahMutasi(m.mutasiRekening)}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${m.mutasiKas < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {rupiahMutasi(m.mutasiKas)}
                      </td>
                      <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                         <Button
                           variant="ghost" size="icon" aria-label="Edit transaksi"
                          onClick={() => {
                            setForm({
                              id: r.id,
                              transaction_date: r.transaction_date,
                              transaction_time: jamID(r.transaction_time),
                              transaction_number: r.transaction_number ?? "",
                              transaction_type: r.transaction_type,
                              amount: String(Number(r.amount)),
                              fee: String(Number(r.fee)),
                              fee_method: r.fee_method ?? "Tunai",
                              transaction_cost: String(Number(r.transaction_cost)),
                              cost_method: r.cost_method ?? "Tidak Ada",
                              payment_method: r.payment_method,
                              description: r.description ?? "",
                              account_id: r.account_id ?? "",
                              cost_account_id: r.cost_account_id ?? r.account_id ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                           <Pencil />
                         </Button>
                         <Button
                           variant="ghost" size="icon" className="text-destructive" aria-label="Hapus transaksi"
                          onClick={() => {
                            if (
                              confirm(
                                "Hapus transaksi ini? Seluruh mutasi kas, rekening, fee, dan biaya ikut dibatalkan.",
                              )
                            )
                              hapus.mutate(r.id);
                          }}
                        >
                           <Trash2 />
                         </Button>
                      </td>
                    </tr>
                  );
                })}
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

      <Modal
        open={open}
        title={form.id ? "Edit Transaksi" : "Tambah Transaksi"}
        onClose={() => setOpen(false)}
      >
        <form
           className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate(form);
          }}
        >
           <div className="sm:col-span-2 border-b border-border pb-2 text-xs font-bold uppercase text-primary">Informasi Transaksi</div>
           <Field label="Tanggal">
            <input
              type="date"
              required
              className={inputClass}
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
          </Field>
          <Field label="Jam">
            <input
              type="time"
              className={inputClass}
              value={form.transaction_time}
              onChange={(e) => setForm({ ...form, transaction_time: e.target.value })}
            />
          </Field>
          <Field label="Nomor transaksi">
            <input
              className={inputClass}
              value={form.transaction_number}
              onChange={(e) => setForm({ ...form, transaction_number: e.target.value })}
            />
          </Field>
          <Field label="Jenis transaksi">
            <select
              className={inputClass}
              value={form.transaction_type}
              onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
            >
              {JENIS_TRANSAKSI.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rekening transaksi">
            <select
              required={rekAktif.length > 0}
              className={inputClass}
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            >
              <option value="">Pilih rekening</option>
              {(rekQ.data ?? []).filter((x) => x.status === "aktif" || x.id === form.account_id).map((x) => (
                <option key={x.id} value={x.id}>{labelRekening(x)}</option>
              ))}
            </select>
          </Field>
           <div className="sm:col-span-2 mt-2 border-b border-border pb-2 text-xs font-bold uppercase text-primary">Nilai & Fee</div>
           <Field label="Nominal">
            <input
              inputMode="numeric"
              required
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </Field>
          {form.transaction_type !== "Fee Masuk" ? (<>
          <Field label="Fee (pendapatan agen)">
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </Field>
          <Field label="Metode pembayaran fee">
            <select
              className={inputClass}
              value={form.fee_method}
              onChange={(e) => setForm({ ...form, fee_method: e.target.value })}
            >
              {METODE_FEE.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
           <div className="sm:col-span-2 mt-2 border-b border-border pb-2 text-xs font-bold uppercase text-primary">Biaya & Metode</div>
           <Field label="Metode pembayaran biaya">
            <select
              className={inputClass}
              value={form.cost_method}
              onChange={(e) => setForm({ ...form, cost_method: e.target.value })}
            >
              {METODE_BIAYA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Biaya transaksi">
            <input
              inputMode="numeric"
              disabled={form.cost_method === "Tidak Ada"}
              className={`${inputClass} disabled:opacity-50`}
              value={form.cost_method === "Tidak Ada" ? "" : form.transaction_cost}
              onChange={(e) =>
                setForm({ ...form, transaction_cost: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </Field>
          {form.cost_method === "Saldo" ? (
          <Field label="Rekening pembayaran biaya">
            <select
              className={inputClass}
              value={form.cost_account_id || form.account_id}
              onChange={(e) => setForm({ ...form, cost_account_id: e.target.value })}
            >
              {(rekQ.data ?? []).filter((x) => x.status === "aktif" || x.id === form.cost_account_id).map((x) => (
                <option key={x.id} value={x.id}>{labelRekening(x)}</option>
              ))}
            </select>
          </Field>) : null}
          <Field label="Metode pembayaran transaksi">
            <select
              className={inputClass}
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              {METODE_PEMBAYARAN.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          </>) : null}
          <div className="sm:col-span-2">
            <Field label="Keterangan">
              <input
                className={inputClass}
                maxLength={200}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>

           <div className="sm:col-span-2 rounded-lg border border-border bg-secondary/50 p-4 text-xs">
            <p className="mb-1 font-medium">Dampak otomatis transaksi ini</p>
            <div className="grid grid-cols-3 gap-2 tabular-nums">
              <div>
                <span className="block text-muted-foreground">Saldo Rekening</span>
                <span
                  className={pratinjau.mutasiRekening < 0 ? "text-destructive" : "text-success"}
                >
                  {rupiahMutasi(pratinjau.mutasiRekening)}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground">Uang Kas</span>
                <span className={pratinjau.mutasiKas < 0 ? "text-destructive" : "text-success"}>
                  {rupiahMutasi(pratinjau.mutasiKas)}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground">Pendapatan Fee</span>
                <span className="text-success">{rupiahMutasi(pratinjau.pendapatanFee)}</span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>
              Simpan
            </button>
          </div>
          {simpan.isError ? (
            <p className="sm:col-span-2 text-xs text-destructive">{simpan.error instanceof Error && simpan.error.message === "Pilih rekening transaksi" ? simpan.error.message : "Gagal menyimpan transaksi."}</p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
