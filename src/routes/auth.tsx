import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { inputClass, btnPrimary, btnGhost, Field } from "@/components/Modal";

export const Route = createFileRoute("/auth")({
  ssr: false,
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    setLoading(true);
    try {
      if (mode === "masuk") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setPesan("Akun dibuat. Cek email Anda untuk konfirmasi.");
      }
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setPesan(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPesan("Gagal masuk dengan Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">B</div><div><h1 className="text-lg font-bold">Buku Kas Agen</h1><p className="text-xs text-muted-foreground">Pembukuan Agen Layanan Keuangan</p></div></div>
        <p className="mb-4 text-sm text-muted-foreground">
          {mode === "masuk" ? "Masuk ke akun Anda" : "Buat akun baru"}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kata sandi">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {mode === "masuk" ? "Masuk" : "Daftar"}
          </button>
        </form>
        <button onClick={google} className={`${btnGhost} mt-2 w-full`}>
          Lanjutkan dengan Google
        </button>
        {pesan ? <p className="mt-3 text-xs text-destructive">{pesan}</p> : null}
        <button
          onClick={() => setMode(mode === "masuk" ? "daftar" : "masuk")}
          className="mt-4 w-full text-xs text-muted-foreground underline"
        >
          {mode === "masuk" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </main>
  );
}
