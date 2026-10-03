import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Clock, UserX, Ban } from "lucide-react";
import { PageHeader, Kpi, Panel, tableHeadClass, tableRowClass, tableCellClass } from "@/components/ui-kit";
import { clientsQuery } from "@/lib/admin-data";
import { STATUS_LABEL } from "@/lib/akses";
import { tanggalID } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { StatusAksesBadge } from "@/components/StatusAksesBadge";

export const Route = createFileRoute("/admin/")({
  head: () => pageMeta("Admin", "Ringkasan client dan masa aktif."),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data = [] } = useQuery(clientsQuery);
  const hitung = (s: string) => data.filter((c) => c.status === s).length;
  const segera = data.filter((c) => c.status === "EXPIRING_SOON" || c.status === "EXPIRED");
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Admin" subtitle="Pantau client dan masa aktif akun." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Total Client" value={String(data.length)} icon={<Users className="size-4" />} />
        <Kpi label="Client Aktif" value={String(hitung("ACTIVE"))} tone="positive" icon={<UserCheck className="size-4" />} />
        <Kpi label={STATUS_LABEL.EXPIRING_SOON} value={String(hitung("EXPIRING_SOON"))} tone="warning" icon={<Clock className="size-4" />} />
        <Kpi label="Expired" value={String(hitung("EXPIRED"))} tone="negative" icon={<UserX className="size-4" />} />
        <Kpi label="Ditangguhkan" value={String(hitung("SUSPENDED"))} icon={<Ban className="size-4" />} />
      </div>
      <Panel title="Perlu perhatian">
        {segera.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada client yang akan berakhir atau expired.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={tableHeadClass}><th className={tableCellClass}>Agen</th><th className={tableCellClass}>Berakhir</th><th className={tableCellClass}>Status</th></tr></thead>
              <tbody>
                {segera.map((c) => (
                  <tr key={c.user_id} className={tableRowClass}>
                    <td className={tableCellClass}>{c.agent_name}</td>
                    <td className={tableCellClass}>{tanggalID(c.active_until)}</td>
                    <td className={tableCellClass}><StatusAksesBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to="/admin/client" className="mt-4 inline-block text-sm font-medium text-primary">Kelola client →</Link>
      </Panel>
    </div>
  );
}
