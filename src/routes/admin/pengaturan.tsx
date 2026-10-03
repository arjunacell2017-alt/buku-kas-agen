import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/ui-kit";
import { Field, inputClass } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => pageMeta("Pengaturan Admin", "Ganti kata sandi akun administrator."),
  component: PengaturanAdmin,
});

function PengaturanAdmin() {
  const { user } = Route.useRouteContext();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (baru.length < 8) return setMsg("Kata sandi baru minimal 8 karakter.");
    const { error } = await supabase.auth.updateUser({ password: baru, current_password: lama } as never);
    setMsg(error ? "Gagal mengganti kata sandi. Periksa kata sandi lama." : "Kata sandi berhasil diganti.");
    if (!error) { setLama(""); setBaru(""); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan Admin" subtitle={`Masuk sebagai ${user.email ?? ""}`} />
      <Panel title="Ganti Kata Sandi">
        <form onSubmit={simpan} className="max-w-sm space-y-3">
          <Field label="Kata Sandi Lama"><input type="password" required value={lama} onChange={(e) => setLama(e.target.value)} className={inputClass} /></Field>
          <Field label="Kata Sandi Baru"><input type="password" required value={baru} onChange={(e) => setBaru(e.target.value)} className={inputClass} /></Field>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          <Button type="submit">Simpan</Button>
        </form>
      </Panel>
    </div>
  );
}
