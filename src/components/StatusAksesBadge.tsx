import { STATUS_LABEL, type StatusAkses } from "@/lib/akses";

const TONE: Record<StatusAkses, string> = {
  ACTIVE: "bg-success/15 text-success",
  EXPIRING_SOON: "bg-warning/15 text-warning-foreground",
  EXPIRED: "bg-destructive/15 text-destructive",
  SUSPENDED: "bg-muted text-muted-foreground",
  PENDING: "bg-secondary text-secondary-foreground",
};

export function StatusAksesBadge({ status }: { status: StatusAkses }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}
