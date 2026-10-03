import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { cekAkses, bolehMasuk } from "@/lib/akses";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const akses = await cekAkses(data.user.id);
    if (!bolehMasuk(akses)) {
      await supabase.auth.signOut();
      throw redirect({
        to: "/auth",
        search: {
          alasan: akses.status === "SUSPENDED" ? "suspended" : akses.status === "EXPIRED" ? "expired" : "noaccess",
          sampai: akses.activeUntil ?? undefined,
        },
      });
    }
    return { user: data.user, isAdmin: akses.isAdmin };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { isAdmin } = Route.useRouteContext();
  return (
    <AppShell isAdmin={isAdmin}>
      <Outlet />
    </AppShell>
  );
}
