import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ReceiptText,
  Settings,
  Shield,
  Users,
  Activity,
  BookOpen,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const MENU = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transaksi", label: "Transaksi", icon: Receipt },
  { to: "/mutasi", label: "Mutasi Dana", icon: ArrowLeftRight },
  { to: "/kas", label: "Kas", icon: Wallet },
  { to: "/rekening", label: "Rekening", icon: Landmark },
  { to: "/biaya", label: "Biaya Operasional", icon: ReceiptText },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
];

const ADMIN_MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/client", label: "Client / Agen", icon: Users },
  { to: "/admin/aktivitas", label: "Aktivitas", icon: Activity },
];

export function AppShell({ children, isAdmin = false, admin = false }: { children: ReactNode; isAdmin?: boolean; admin?: boolean }) {
  const menu = admin ? ADMIN_MENU : MENU;
  const settingsTo = admin ? "/admin/pengaturan" : "/pengaturan";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const title = menu.find((item) => item.to === pathname)?.label ?? (pathname === settingsTo ? (admin ? "Pengaturan Admin" : "Pengaturan") : "Buku Kas");
  const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {menuOpen ? <div className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-sidebar-border bg-sidebar transition-transform md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">B</div>
          <div>
            <p className="text-sm font-bold text-sidebar-accent-foreground">Buku Kas Agen</p>
            <p className="text-xs text-sidebar-foreground">{admin ? "Panel Administrator" : "Pembukuan Agen Layanan Keuangan"}</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground md:hidden" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X /></Button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {menu.map((m) => (
            <Link
              key={m.to}
              activeOptions={{ exact: true }}
              to={m.to}
              onClick={() => setMenuOpen(false)}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "border border-sidebar-primary/30 bg-sidebar-accent text-sidebar-primary" }}
            >
              <m.icon className="size-[18px]" />
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to={settingsTo}
            onClick={() => setMenuOpen(false)}
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
          >
            <Settings className="size-[18px]" />
            {admin ? "Pengaturan Admin" : "Pengaturan"}
          </Link>
          {admin || isAdmin ? (
            <Link
              to={admin ? "/dashboard" : "/admin"}
              onClick={() => setMenuOpen(false)}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {admin ? <BookOpen className="size-[18px]" /> : <Shield className="size-[18px]" />}
              {admin ? "Buku Kas Saya" : "Panel Admin"}
            </Link>
          ) : null}
          <Button
            variant="ghost"
            onClick={keluar}
            className="mt-1 w-full justify-start px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="md:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu /></Button>
            <div>
              <p className="text-sm font-bold text-foreground sm:text-base">{title}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Kelola pembukuan agen dengan rapi</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">Buku Kas Agen</p>
            <p className="text-xs text-muted-foreground">{tanggal}</p>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
