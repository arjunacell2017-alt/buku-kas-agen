import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSaldo, saveSettings, type Settings } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { Field, inputClass, btnPrimary } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  component: PengaturanPage,
});

function PengaturanPage() {
  const qc = useQueryClient();
  const saldo = useQuery({ queryKey: ["saldo"], queryFn: fetchSaldo });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (saldo.data && !form) setForm(saldo.data.settings);
  }, [saldo.data, form]);

  const simpan = useMutation({
    mutationFn: async () => {
      if (form) await saveSettings(form);
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  if (!form) return <p className="text-sm text-muted-foreground">Memuat...</p>;

  const num = (v: string) => Number(v.replace(/[^0-9]/g, "") || 0);
  const s = saldo.data;
  const totalAwal = form.opening_cash_balance + form.opening_bank_balance;

  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan Saldo Awal" />

      <Panel title="Saldo Awal / Modal Awal">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate();
          }}
        >
          <Field label="Nama usaha">
            <input
              className={inputClass}
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </Field>
          <Field label="Tanggal mulai pembukuan">
            <input
              type="date"
              className={inputClass}
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Field>
          <Field label="Saldo awal rekening">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.opening_bank_balance)}
              onChange={(e) => setForm({ ...form, opening_bank_balance: num(e.target.value) })}
            />
          </Field>
          <Field label="Uang kas awal / uang kertas">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.opening_cash_balance)}
              onChange={(e) => setForm({ ...form, opening_cash_balance: num(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            Total Dana Awal: <span className="font-semibold tabular-nums">{rupiah(totalAwal)}</span>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>
              Simpan
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Saldo awal adalah titik awal pembukuan dan tidak berubah otomatis saat ada transaksi.
        </p>
      </Panel>

      <Panel title="Rekonsiliasi">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate();
          }}
        >
          <Field label="Kas fisik aktual (hasil hitung uang)">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.actual_cash_balance)}
              onChange={(e) => setForm({ ...form, actual_cash_balance: num(e.target.value) })}
            />
          </Field>
          <Field label="Saldo rekening aktual">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.actual_bank_balance)}
              onChange={(e) => setForm({ ...form, actual_bank_balance: num(e.target.value) })}
            />
          </Field>
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Kas pembukuan {rupiah(s?.saldoKas ?? 0)} — selisih {rupiah(s?.selisihKas ?? 0)}
            </p>
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihKas ?? 0} />
            </div>
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Rekening pembukuan {rupiah(s?.saldoBank ?? 0)} — selisih {rupiah(s?.selisihBank ?? 0)}
            </p>
            <div className="pt-1">
              <StatusBadge selisih={s?.selisihBank ?? 0} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={btnPrimary} disabled={simpan.isPending}>
              Simpan
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
