import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buku Kas Agen BRILink — Pembukuan Harian Sederhana" },
      {
        name: "description",
        content:
          "Catat transaksi, kas, saldo rekening, fee, biaya, dan laba bersih Agen BRILink dalam satu dashboard ringan.",
      },
      { property: "og:title", content: "Buku Kas Agen BRILink" },
      {
        property: "og:description",
        content: "Pembukuan harian Agen BRILink yang ringan, cepat, dan mudah dipakai.",
      },
    ],
  }),
  component: Beranda,
});

function Beranda() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Buku Kas Agen BRILink
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pencatatan transaksi harian, kas, rekening, biaya operasional, laba bersih, dan
          rekonsiliasi — sederhana dan cepat.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Buka Dashboard
          </Link>
          <Link
            to="/auth"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
