import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MENU = [
  { to: "/dashboard", label: "Dashboard", short: "Home" },
  { to: "/transaksi", label: "Transaksi", short: "Transaksi" },
  { to: "/kas", label: "Kas", short: "Kas" },
  { to: "/rekening", label: "Rekening", short: "Rek" },
  { to: "/biaya", label: "Biaya Operasional", short: "Biaya" },
  { to: "/laporan", label: "Laporan", short: "Laporan" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-sidebar-foreground">Buku Kas BRILink</p>
          <p className="text-xs text-muted-foreground">Pembukuan Agen</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {MENU.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="block rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-medium" }}
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="p-2">
          <Link
            to="/pengaturan"
            className="block rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent font-medium" }}
          >
            Pengaturan
          </Link>
          <button
            onClick={keluar}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="md:pl-56">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <span className="text-sm font-semibold">Buku Kas BRILink</span>
          <button onClick={keluar} className="text-xs text-muted-foreground">
            Keluar
          </button>
        </header>
        <main className="px-3 pb-24 pt-4 md:px-6 md:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-border bg-card md:hidden">
        {MENU.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="px-1 py-2 text-center text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-medium" }}
          >
            {m.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
