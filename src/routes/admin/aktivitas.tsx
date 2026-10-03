import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, tableHeadClass, tableRowClass, tableCellClass } from "@/components/ui-kit";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/aktivitas")({
  head: () => pageMeta("Aktivitas Admin", "Riwayat tindakan admin terhadap akun client."),
  component: AktivitasPage,
});

function AktivitasPage() {
  const { data = [] } = useQuery({
    queryKey: ["admin", "aktivitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_activity").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const fmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-6">
      <PageHeader title="Aktivitas" subtitle="200 tindakan admin terakhir." />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={tableHeadClass}><th className={tableCellClass}>Waktu</th><th className={tableCellClass}>Client</th><th className={tableCellClass}>Tindakan</th><th className={tableCellClass}>Keterangan</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className={tableRowClass}>
                  <td className={`${tableCellClass} whitespace-nowrap`}>{fmt.format(new Date(a.created_at))}</td>
                  <td className={tableCellClass}>{a.client_label}</td>
                  <td className={tableCellClass}>{a.action}</td>
                  <td className={tableCellClass}>{a.detail}</td>
                </tr>
              ))}
              {data.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Belum ada aktivitas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
