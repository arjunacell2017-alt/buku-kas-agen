import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import { rupiah } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {title ? (
        <header className="border-b border-border bg-surface-subtle px-5 py-3.5 text-sm font-semibold text-foreground">
          {title}
        </header>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  tone = "default",
  icon,
  prominent = false,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "positive" | "negative";
  icon?: ReactNode;
  prominent?: boolean;
}) {
  const color =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${prominent ? "sm:p-5" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
        {icon ? <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div> : null}
      </div>
      <div className={`mt-2 font-bold tabular-nums ${prominent ? "text-xl sm:text-2xl" : "text-lg"} ${color}`}>
        {typeof value === "number" ? rupiah(value) : value}
      </div>
    </div>
  );
}

export function StatusBadge({ selisih }: { selisih: number }) {
  const balance = Math.round(selisih) === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
        balance ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      {balance ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {balance ? "BALANCE" : "ADA SELISIH"}
    </span>
  );
}

export function Empty({
  text = "Belum ada data",
  description,
  action,
}: {
  text?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{text}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export const tableHeadClass =
  "border-b border-border bg-surface-subtle text-left text-[11px] font-semibold uppercase text-muted-foreground";
export const tableRowClass = "border-b border-border/70 last:border-b-0 hover:bg-secondary/45";
export const tableCellClass = "px-4 py-3";
