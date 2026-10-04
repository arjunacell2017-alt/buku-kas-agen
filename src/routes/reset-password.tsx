import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inputClass, btnPrimary, Field } from "@/components/Modal";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Buat Kata Sandi Baru — Buku Kas Agen" },
      { name: "description", content: "Atur kata sandi baru akun Buku Kas Agen." },
      { property: "og:title", content: "Buat Kata Sandi Baru — Buku Kas Agen" },
      { property: "og:description", content: "Atur kata sandi baru akun Buku Kas Agen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setPesan("Kata sandi minimal 8 karakter.");
    if (pw !== pw2) return setPesan("Konfirmasi kata sandi tidak sama.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setPesan("Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman masuk.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold">Buat Kata Sandi Baru</h1>
        <p className="mb-4 text-sm text-muted-foreground">Setelah disimpan, silakan masuk dengan kata sandi baru.</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Kata Sandi Baru"><input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} /></Field>
          <Field label="Konfirmasi Kata Sandi"><input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} /></Field>
          <button type="submit" className={`${btnPrimary} w-full`}>Simpan</button>
        </form>
        {pesan ? <p className="mt-3 text-xs text-destructive">{pesan}</p> : null}
      </div>
    </main>
  );
}
