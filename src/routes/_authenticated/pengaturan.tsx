import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSaldo,
  saveSettings,
  saveRekening,
  labelRekening,
  type Settings,
  type Rekening,
  getUserId,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Modal, btnGhost } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { todayISO } from "@/lib/format";
import { rupiah } from "@/lib/format";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { Field, inputClass, btnPrimary } from "@/components/Modal";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => pageMeta("Pengaturan", "Atur saldo awal dan angka aktual untuk rekonsiliasi."),
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

  type FormRek = {
    id?: string;
    bank_name: string;
    account_number: string;
    owner_name: string;
    opening_balance: string;
    start_date: string;
  };
  const [rekForm, setRekForm] = useState<FormRek | null>(null);
  const simpanRek = useMutation({
    mutationFn: async (f: FormRek) =>
      saveRekening({ ...f, opening_balance: Number(f.opening_balance || 0) }),
    onSuccess: () => {
      setRekForm(null);
      qc.invalidateQueries();
    },
  });
  const hapusRek = useMutation({
    mutationFn: async (r: Rekening) => {
      const [a, b] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", await getUserId())
          .or(`account_id.eq.${r.id},cost_account_id.eq.${r.id}`),
        supabase
          .from("bank_transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", await getUserId())
          .eq("account_id", r.id),
      ]);
      if ((a.count ?? 0) + (b.count ?? 0) > 0) {
        // Sudah punya mutasi: nonaktifkan agar saldo & riwayat tetap utuh
        await saveRekening({ ...r, status: "nonaktif" });
      } else {
        const { error } = await supabase.from("bank_accounts").delete().eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  if (saldo.isError && !form)
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
        <p className="text-sm text-destructive">
          Pengaturan gagal dimuat: {(saldo.error as Error)?.message ?? "terjadi kesalahan"}
        </p>
        <Button variant="outline" onClick={() => saldo.refetch()} disabled={saldo.isFetching}>
          {saldo.isFetching ? "Memuat ulang..." : "Coba lagi"}
        </Button>
      </div>
    );
  if (!form) return <p className="text-sm text-muted-foreground">Memuat...</p>;

  const num = (v: string) => Number(v.replace(/[^0-9]/g, "") || 0);
  const s = saldo.data;
  const rekList = s?.perRekening ?? [];
  const totalRek = rekList.reduce((a, r) => a + r.opening_balance, 0);
  const totalAwal = form.opening_cash_balance + totalRek;

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" subtitle="Kelola saldo awal dan rekonsiliasi pembukuan." />

      <Panel title="Saldo Awal Kas / Modal Awal">
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
          <Field label="Uang kas awal / uang kertas">
            <input
              inputMode="numeric"
              className={inputClass}
              value={String(form.opening_cash_balance)}
              onChange={(e) => setForm({ ...form, opening_cash_balance: num(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm">
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

      <Panel title="Saldo Awal Rekening">
        <div className="mb-3 flex justify-end">
          <Button
            onClick={() =>
              setRekForm({
                bank_name: "",
                account_number: "",
                owner_name: "",
                opening_balance: "",
                start_date: todayISO(),
              })
            }
          >
            <Plus /> Tambah Rekening
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rekList.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <p className="font-bold text-primary">
                {labelRekening(r)}{" "}
                {r.status !== "aktif" ? (
                  <span className="text-xs text-muted-foreground">(nonaktif)</span>
                ) : null}
              </p>
              {r.owner_name ? (
                <p className="text-xs text-muted-foreground">a.n. {r.owner_name}</p>
              ) : null}
              <p className="mt-1 text-sm">
                Saldo Awal:{" "}
                <span className="font-semibold tabular-nums">{rupiah(r.opening_balance)}</span>
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRekForm({
                      id: r.id,
                      bank_name: r.bank_name,
                      account_number: r.account_number ?? "",
                      owner_name: r.owner_name ?? "",
                      opening_balance: String(r.opening_balance),
                      start_date: r.start_date,
                    })
                  }
                >
                  <Pencil /> Edit
                </Button>
                {r.status === "aktif" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        confirm(
                          "Hapus rekening ini? Jika sudah memiliki mutasi, rekening akan dinonaktifkan agar riwayat tetap utuh.",
                        )
                      )
                        hapusRek.mutate(r);
                    }}
                  >
                    <Trash2 /> Hapus
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      saveRekening({ ...r, status: "aktif" }).then(() => qc.invalidateQueries())
                    }
                  >
                    Aktifkan
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm">
          Total Saldo Awal Rekening:{" "}
          <span className="font-semibold tabular-nums">{rupiah(totalRek)}</span>
        </div>
      </Panel>

      <Modal
        open={!!rekForm}
        title={rekForm?.id ? "Edit Rekening" : "Tambah Rekening"}
        onClose={() => setRekForm(null)}
      >
        {rekForm ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              simpanRek.mutate(rekForm);
            }}
          >
            <Field label="Nama bank">
              <input
                required
                maxLength={60}
                className={inputClass}
                value={rekForm.bank_name}
                onChange={(e) => setRekForm({ ...rekForm, bank_name: e.target.value })}
              />
            </Field>
            <Field label="Nomor rekening (opsional)">
              <input
                inputMode="numeric"
                maxLength={30}
                className={inputClass}
                value={rekForm.account_number}
                onChange={(e) =>
                  setRekForm({ ...rekForm, account_number: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </Field>
            <Field label="Nama pemilik (opsional)">
              <input
                maxLength={80}
                className={inputClass}
                value={rekForm.owner_name}
                onChange={(e) => setRekForm({ ...rekForm, owner_name: e.target.value })}
              />
            </Field>
            <Field label="Saldo awal">
              <input
                inputMode="numeric"
                className={inputClass}
                value={rekForm.opening_balance}
                onChange={(e) =>
                  setRekForm({ ...rekForm, opening_balance: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </Field>
            <Field label="Tanggal mulai">
              <input
                type="date"
                required
                className={inputClass}
                value={rekForm.start_date}
                onChange={(e) => setRekForm({ ...rekForm, start_date: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setRekForm(null)}>
                Batal
              </button>
              <button type="submit" className={btnPrimary} disabled={simpanRek.isPending}>
                Simpan
              </button>
            </div>
            {simpanRek.isError ? (
              <p className="sm:col-span-2 text-xs text-destructive">Gagal menyimpan rekening.</p>
            ) : null}
          </form>
        ) : null}
      </Modal>

      <Panel title="Rekonsiliasi Kas">
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
              Total rekening pembukuan {rupiah(s?.saldoBank ?? 0)} — selisih{" "}
              {rupiah(s?.selisihBank ?? 0)}
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
