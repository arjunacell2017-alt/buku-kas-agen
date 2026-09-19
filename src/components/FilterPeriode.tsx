import { PERIODE_LABEL, rangeFromPeriode, type Periode } from "@/lib/format";
import { inputClass } from "@/components/Modal";
import { Panel } from "@/components/ui-kit";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilterPeriode({
  periode,
  from,
  to,
  onChange,
}: {
  periode: Periode;
  from: string;
  to: string;
  onChange: (p: Periode, from: string, to: string) => void;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-1 flex h-10 items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" /> Periode
        </div>
        <div className="flex flex-wrap gap-1">
          {PERIODE_LABEL.map(([k, label]) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={periode === k ? "default" : "outline"}
              onClick={() => {
                const r = rangeFromPeriode(k);
                onChange(k, r.from, r.to);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange("custom", e.target.value, to)}
          className={`${inputClass} w-40`}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => onChange("custom", from, e.target.value)}
          className={`${inputClass} w-40`}
        />
      </div>
    </Panel>
  );
}
