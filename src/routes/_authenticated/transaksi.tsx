import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/db";
import { rupiah, tanggalID, jamID, todayISO, nowTime, parseNominal } from "@/lib/format";
import { JENIS_TRANSAKSI, METODE_PEMBAYARAN } from "@/lib/konstanta";
import { PageHeader, Panel, Empty } from "@/components/ui-kit";
import { Modal, Field, inputClass, btnPrimary, btnGhost } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/transaksi")({
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
  transaction_cost: string;
  payment_method: string;
  description: string;
};

const kosong = (): Form => ({
  transaction_date: todayISO(),
  transaction_time: nowTime(),
  transaction_number: "",
  transaction_type: "Tarik Tunai",
  amount: "",
  fee: "",
  transaction_cost: "",
  payment_method: "Tunai",
  description: "",
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

  const list = useQuery({
    queryKey: ["transaksi", halaman, cari, jenis, dari, sampai],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select(
          "id,transaction_date,transaction_time,transaction_number,transaction_type,amount,fee,transaction_cost,payment_method,description",
          { count: "exact" },
        )
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
      const payload = {
        transaction_date: f.transaction_date,
        transaction_time: f.transaction_time || "00:00",
        transaction_number: f.transaction_number || null,
        transaction_type: f.transaction_type,
        amount: parseNominal(f.amount),
        fee: parseNominal(f.fee),
        transaction_cost: parseNominal(f.transaction_cost),
        payment_method: f.payment_method,
        description: f.description || null,
      };
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transaksi"
        action={
          <button
            className={btnPrimary}
            onClick={() => {
              setForm(kosong());
              setOpen(true);
            }}
          >
            Tambah Transaksi
          </button>
        }
      />

      <Panel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Cari keterangan / no. transaksi"
            value={cari}
            onChange={(e) => {
              setHalaman(0);
              setCari(e.target.value);
            }}
            className={inputClass}
          />
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
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2">Tanggal</th>
                  <th className="py-2">Jam</th>
                  <th className="py-2">No.</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Nominal</th>
                  <th className="py-2 text-right">Fee</th>
                  <th className="py-2">Metode</th>
                  <th className="py-2">Keterangan</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 whitespace-nowrap">{tanggalID(r.transaction_date)}</td>
                    <td className="py-2">{jamID(r.transaction_time)}</td>
                    <td className="py-2">{r.transaction_number ?? "-"}</td>
                    <td className="py-2 whitespace-nowrap">{r.transaction_type}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.amount)}</td>
                    <td className="py-2 text-right tabular-nums">{rupiah(r.fee)}</td>
                    <td className="py-2">{r.payment_method}</td>
                    <td className="py-2 text-muted-foreground">{r.description ?? "-"}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        className="text-xs text-primary underline"
                        onClick={() => {
                          setForm({
                            id: r.id,
                            transaction_date: r.transaction_date,
                            transaction_time: jamID(r.transaction_time),
                            transaction_number: r.transaction_number ?? "",
                            transaction_type: r.transaction_type,
                            amount: String(Number(r.amount)),
                            fee: String(Number(r.fee)),
                            transaction_cost: String(Number(r.transaction_cost)),
                            payment_method: r.payment_method,
                            description: r.description ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="ml-3 text-xs text-destructive underline"
                        onClick={() => {
                          if (confirm("Hapus transaksi ini?")) hapus.mutate(r.id);
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

      <Modal
        open={open}
        title={form.id ? "Edit Transaksi" : "Tambah Transaksi"}
        onClose={() => setOpen(false)}
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate(form);
          }}
        >
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
          <Field label="Nominal">
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </Field>
          <Field label="Fee">
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </Field>
          <Field label="Biaya transaksi">
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.transaction_cost}
              onChange={(e) =>
                setForm({ ...form, transaction_cost: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </Field>
          <Field label="Metode pembayaran">
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
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>
              Simpan
            </button>
          </div>
          {simpan.isError ? (
            <p className="sm:col-span-2 text-xs text-destructive">Gagal menyimpan transaksi.</p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
