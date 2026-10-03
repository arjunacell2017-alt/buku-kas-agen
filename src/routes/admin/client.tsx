import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, CalendarPlus, Ban, CheckCircle2, KeyRound, Trash2, Eye, Search } from "lucide-react";
import { PageHeader, Panel, Kpi, tableHeadClass, tableRowClass, tableCellClass } from "@/components/ui-kit";
import { Modal, Field, inputClass } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { StatusAksesBadge } from "@/components/StatusAksesBadge";
import { clientsQuery, ringkasanClient, type ClientRow } from "@/lib/admin-data";
import { JENIS_AGEN, MASA_AKTIF, tambahDurasi } from "@/lib/akses";
import { tanggalID, todayISO } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { buatClient, ubahClient, perpanjangClient, setTangguhkan, resetPasswordClient, hapusClient } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/client")({
  head: () => pageMeta("Client / Agen", "Kelola akun client dan masa aktif."),
  component: ClientPage,
});

type Dialog =
  | { kind: "tambah" }
  | { kind: "edit"; c: ClientRow }
  | { kind: "perpanjang"; c: ClientRow }
  | { kind: "reset"; c: ClientRow }
  | { kind: "detail"; c: ClientRow }
  | null;

function ClientPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(clientsQuery);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [cari, setCari] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tangguhkan = useServerFn(setTangguhkan);
  const hapus = useServerFn(hapusClient);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const aksi = useMutation({
    mutationFn: (f: () => Promise<unknown>) => f(),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : "Terjadi kesalahan"),
  });

  const list = data.filter((c) => `${c.agent_name} ${c.owner_name} ${c.email}`.toLowerCase().includes(cari.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client / Agen"
        subtitle="Buat dan kelola akun client beserta masa aktifnya."
        action={<Button onClick={() => setDialog({ kind: "tambah" })}><Plus /> Tambah Client</Button>}
      />
      {error ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <input placeholder="Cari nama agen, pemilik, atau email" value={cari} onChange={(e) => setCari(e.target.value)} className={`${inputClass} max-w-sm`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadClass}>
                <th className={tableCellClass}>Agen</th>
                <th className={tableCellClass}>Email / HP</th>
                <th className={tableCellClass}>Jenis</th>
                <th className={tableCellClass}>Masa Aktif</th>
                <th className={tableCellClass}>Status</th>
                <th className={`${tableCellClass} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.user_id} className={tableRowClass}>
                  <td className={tableCellClass}><div className="font-semibold">{c.agent_name}</div><div className="text-xs text-muted-foreground">{c.owner_name}</div></td>
                  <td className={tableCellClass}><div>{c.email}</div><div className="text-xs text-muted-foreground">{c.phone}</div></td>
                  <td className={tableCellClass}>{c.agent_type}</td>
                  <td className={tableCellClass}>{tanggalID(c.active_from)} – {tanggalID(c.active_until)}</td>
                  <td className={tableCellClass}><StatusAksesBadge status={c.status} /></td>
                  <td className={`${tableCellClass} whitespace-nowrap text-right`}>
                    <Button variant="ghost" size="icon" title="Ringkasan" onClick={() => setDialog({ kind: "detail", c })}><Eye /></Button>
                    <Button variant="ghost" size="icon" title="Ubah" onClick={() => setDialog({ kind: "edit", c })}><Pencil /></Button>
                    <Button variant="ghost" size="icon" title="Perpanjang" onClick={() => setDialog({ kind: "perpanjang", c })}><CalendarPlus /></Button>
                    <Button variant="ghost" size="icon" title="Reset kata sandi" onClick={() => setDialog({ kind: "reset", c })}><KeyRound /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={c.suspended ? "Aktifkan kembali" : "Tangguhkan"}
                      onClick={() => {
                        if (confirm(c.suspended ? `Aktifkan kembali ${c.agent_name}?` : `Tangguhkan akun ${c.agent_name}?`))
                          aksi.mutate(() => tangguhkan({ data: { user_id: c.user_id, suspended: !c.suspended } }));
                      }}
                    >
                      {c.suspended ? <CheckCircle2 /> : <Ban />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Hapus ${c.agent_name}? Akun dan SELURUH data pembukuannya akan dihapus permanen.`))
                          aksi.mutate(() => hapus({ data: { user_id: c.user_id } }));
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada client.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {dialog?.kind === "tambah" || dialog?.kind === "edit" ? (
        <FormClient c={dialog.kind === "edit" ? dialog.c : null} onClose={() => setDialog(null)} onDone={refresh} />
      ) : null}
      {dialog?.kind === "perpanjang" ? <FormPerpanjang c={dialog.c} onClose={() => setDialog(null)} onDone={refresh} /> : null}
      {dialog?.kind === "reset" ? <FormReset c={dialog.c} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "detail" ? <DetailClient c={dialog.c} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function FormClient({ c, onClose, onDone }: { c: ClientRow | null; onClose: () => void; onDone: () => void }) {
  const buat = useServerFn(buatClient);
  const ubah = useServerFn(ubahClient);
  const [f, setF] = useState({
    agent_name: c?.agent_name ?? "",
    owner_name: c?.owner_name ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    agent_type: c?.agent_type ?? "AgenBRILink",
    password: "",
    konfirmasi: "",
    masa: c ? "custom" : "30d",
    active_from: c?.active_from ?? todayISO(),
    active_until: c?.active_until ?? tambahDurasi(todayISO(), "30d"),
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const until = f.masa === "custom" ? f.active_until : tambahDurasi(f.active_from, f.masa);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!c && f.password.length < 8) return setErr("Kata sandi minimal 8 karakter.");
    if (!c && f.password !== f.konfirmasi) return setErr("Konfirmasi kata sandi tidak sama.");
    if (until < f.active_from) return setErr("Tanggal berakhir harus setelah tanggal mulai.");
    setBusy(true);
    try {
      const base = { agent_name: f.agent_name, owner_name: f.owner_name, phone: f.phone, agent_type: f.agent_type, active_from: f.active_from, active_until: until };
      if (c) await ubah({ data: { ...base, user_id: c.user_id } });
      else await buat({ data: { ...base, email: f.email, password: f.password } });
      onDone();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={c ? "Ubah Client" : "Tambah Client"} onClose={onClose}>
      <form onSubmit={simpan} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama Agen"><input required value={f.agent_name} onChange={(e) => set("agent_name", e.target.value)} className={inputClass} /></Field>
        <Field label="Nama Pemilik"><input value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} className={inputClass} /></Field>
        <Field label="Email"><input type="email" required disabled={!!c} value={f.email} onChange={(e) => set("email", e.target.value)} className={inputClass} /></Field>
        <Field label="Nomor HP"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} /></Field>
        <Field label="Jenis Agen">
          <select value={f.agent_type} onChange={(e) => set("agent_type", e.target.value)} className={inputClass}>
            {JENIS_AGEN.map((j) => <option key={j}>{j}</option>)}
          </select>
        </Field>
        <Field label="Masa Aktif">
          <select value={f.masa} onChange={(e) => set("masa", e.target.value)} className={inputClass}>
            {MASA_AKTIF.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="Tanggal Mulai"><input type="date" required value={f.active_from} onChange={(e) => set("active_from", e.target.value)} className={inputClass} /></Field>
        <Field label="Tanggal Berakhir">
          {f.masa === "custom" ? (
            <input type="date" required value={f.active_until} onChange={(e) => set("active_until", e.target.value)} className={inputClass} />
          ) : (
            <div className={`${inputClass} flex items-center bg-muted`}>{tanggalID(until)}</div>
          )}
        </Field>
        {!c ? (
          <>
            <Field label="Kata Sandi"><input type="password" required minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} className={inputClass} /></Field>
            <Field label="Konfirmasi Kata Sandi"><input type="password" required value={f.konfirmasi} onChange={(e) => set("konfirmasi", e.target.value)} className={inputClass} /></Field>
          </>
        ) : null}
        {err ? <p className="text-sm text-destructive sm:col-span-2">{err}</p> : null}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function FormPerpanjang({ c, onClose, onDone }: { c: ClientRow; onClose: () => void; onDone: () => void }) {
  const perpanjang = useServerFn(perpanjangClient);
  const today = todayISO();
  const dasar = c.active_until >= today ? c.active_until : today;
  const [masa, setMasa] = useState("30d");
  const [custom, setCustom] = useState(tambahDurasi(dasar, "30d"));
  const [err, setErr] = useState<string | null>(null);
  const baru = masa === "custom" ? custom : tambahDurasi(dasar, masa);
  async function simpan() {
    try {
      await perpanjang({ data: { user_id: c.user_id, active_until: baru } });
      onDone();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    }
  }
  return (
    <Modal open title={`Perpanjang — ${c.agent_name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Berakhir saat ini: <b>{tanggalID(c.active_until)}</b>. Perpanjangan dihitung dari {c.active_until >= today ? "tanggal berakhir" : "hari ini (akun sudah expired)"}.</p>
        <Field label="Tambah">
          <select value={masa} onChange={(e) => setMasa(e.target.value)} className={inputClass}>
            {MASA_AKTIF.filter((m) => m.value !== "2y").map((m) => <option key={m.value} value={m.value}>+{m.label}</option>)}
            <option value="custom">Custom</option>
          </select>
        </Field>
        {masa === "custom" ? <Field label="Berakhir pada"><input type="date" value={custom} onChange={(e) => setCustom(e.target.value)} className={inputClass} /></Field> : null}
        <p className="text-sm">Masa aktif baru sampai: <b>{tanggalID(baru)}</b></p>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={simpan}>Perpanjang</Button></div>
      </div>
    </Modal>
  );
}

function FormReset({ c, onClose }: { c: ClientRow; onClose: () => void }) {
  const reset = useServerFn(resetPasswordClient);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg("Kata sandi minimal 8 karakter.");
    try {
      await reset({ data: { user_id: c.user_id, password: pw } });
      setMsg("Kata sandi berhasil diganti. Berikan kata sandi baru kepada client.");
      setPw("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal");
    }
  }
  return (
    <Modal open title={`Reset Kata Sandi — ${c.agent_name}`} onClose={onClose}>
      <form onSubmit={simpan} className="space-y-3">
        <Field label="Kata Sandi Baru"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} /></Field>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Tutup</Button><Button type="submit">Simpan</Button></div>
      </form>
    </Modal>
  );
}

function DetailClient({ c, onClose }: { c: ClientRow; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "ringkasan", c.user_id], queryFn: () => ringkasanClient(c.user_id) });
  return (
    <Modal open title={`Ringkasan — ${c.agent_name}`} onClose={onClose}>
      <p className="mb-4 text-xs text-muted-foreground">Hanya baca. Data pembukuan client tidak dapat diubah dari sini.</p>
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Saldo Rekening" value={data.saldoRekening} />
          <Kpi label="Saldo Kas" value={data.saldoKas} />
          <Kpi label="Total Dana" value={data.totalDana} />
          <Kpi label="Jumlah Transaksi" value={String(data.jumlahTransaksi)} />
          <Kpi label="Total Fee" value={data.totalFee} tone="positive" />
          <Kpi label="Total Biaya" value={data.totalBiaya} tone="negative" />
          <Kpi label="Laba Bersih" value={data.labaBersih} tone={data.labaBersih >= 0 ? "positive" : "negative"} />
        </div>
      )}
    </Modal>
  );
}
