import type { ReactNode } from "react";
import { rupiah } from "@/lib/format";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {action}
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      {title ? (
        <header className="border-b border-border px-4 py-2.5 text-sm font-medium text-foreground">
          {title}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${color}`}>
        {typeof value === "number" ? rupiah(value) : value}
      </div>
    </div>
  );
}

export function StatusBadge({ selisih }: { selisih: number }) {
  const balance = Math.round(selisih) === 0;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        balance ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      {balance ? "BALANCE" : "SELISIH"}
    </span>
  );
}

export function Empty({ text = "Belum ada data" }: { text?: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
