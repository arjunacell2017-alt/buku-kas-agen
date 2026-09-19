import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-border bg-card shadow-2xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs font-medium text-primary">Buku Kas BRILink</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup dialog">
            <X />
          </Button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:bg-muted disabled:opacity-60";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

export const btnGhost =
  "inline-flex h-9 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50";
