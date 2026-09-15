import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSaldo, saveSettings, type Settings } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui-kit";
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

  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan" />
      <Panel title="Data Usaha & Saldo Awal">
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
          <Field label="Saldo awal kas">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.opening_cash_balance)}
              onChange={(e) => setForm({ ...form, opening_cash_balance: num(e.target.value) })}
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
          <Field label="Saldo kas aktual (fisik)">
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
