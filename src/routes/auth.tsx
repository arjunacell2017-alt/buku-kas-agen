import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { inputClass, btnPrimary, Field } from "@/components/Modal";
import { cekAkses, bolehMasuk } from "@/lib/akses";
import { tanggalID } from "@/lib/format";

const searchSchema = z.object({
  alasan: z.enum(["expired", "suspended", "noaccess"]).optional(),
  sampai: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Masuk — Buku Kas Agen" },
      { name: "description", content: "Masuk untuk mengelola pembukuan agen Anda." },
      { property: "og:title", content: "Masuk — Buku Kas Agen" },
      { property: "og:description", content: "Masuk ke pembukuan agen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function pesanAlasan(alasan?: string, sampai?: string) {
  if (alasan === "suspended") return "Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.";
  if (alasan === "expired")
    return sampai
      ? `Akses Anda telah berakhir pada ${tanggalID(sampai)}. Silakan hubungi administrator untuk memperpanjang akses.`
      : "Akses akun Anda telah berakhir. Silakan hubungi administrator.";
  if (alasan === "noaccess") return "Akun Anda belum memiliki akses. Silakan hubungi administrator.";
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pesan, setPesan] = useState<string | null>(pesanAlasan(search.alasan, search.sampai));
  const [loading, setLoading] = useState(false);

  async function lupa() {
    if (!email) return setPesan("Isi email terlebih dahulu, lalu klik Lupa kata sandi.");
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setPesan("Jika email terdaftar, tautan untuk membuat kata sandi baru telah dikirim.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setPesan("Email atau kata sandi salah.");
        return;
      }
      const akses = await cekAkses(data.user.id);
      if (!bolehMasuk(akses)) {
        await supabase.auth.signOut();
        setPesan(
          akses.status === "SUSPENDED"
            ? pesanAlasan("suspended")
            : akses.status === "EXPIRED"
              ? pesanAlasan("expired", akses.activeUntil ?? undefined)
              : pesanAlasan("noaccess"),
        );
        return;
      }
      navigate({ to: akses.isAdmin ? "/admin" : "/dashboard", replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">B</div><div><h1 className="text-lg font-bold">Buku Kas Agen</h1><p className="text-xs text-muted-foreground">Pembukuan Agen Layanan Keuangan</p></div></div>
        <p className="mb-4 text-sm text-muted-foreground">Masuk ke akun Anda</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Kata Sandi">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </Field>
          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        {pesan ? <p className="mt-3 text-xs text-destructive">{pesan}</p> : null}
        <button type="button" onClick={lupa} className="mt-3 w-full text-xs text-primary underline">Lupa kata sandi?</button>
        <p className="mt-5 text-center text-xs text-muted-foreground">Belum memiliki akses? Hubungi administrator.</p>
      </div>
    </main>
  );
}
