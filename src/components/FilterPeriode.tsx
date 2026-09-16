import { PERIODE_LABEL, rangeFromPeriode, type Periode } from "@/lib/format";
import { inputClass } from "@/components/Modal";
import { Panel } from "@/components/ui-kit";

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
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1">
          {PERIODE_LABEL.map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                const r = rangeFromPeriode(k);
                onChange(k, r.from, r.to);
              }}
              className={`rounded-md px-3 py-2 text-sm ${
                periode === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {label}
            </button>
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
