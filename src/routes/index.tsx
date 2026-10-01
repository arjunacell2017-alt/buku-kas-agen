import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Beranda,
});

function Beranda() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">B</div>
        <h1 className="text-2xl font-bold text-foreground">
          Buku Kas Agen BRILink
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pencatatan transaksi harian, kas, rekening, biaya operasional, laba bersih, dan
          rekonsiliasi — sederhana dan cepat.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild><Link to="/dashboard">Buka Dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/auth">Masuk</Link></Button>
        </div>
      </div>
    </main>
  );
}
