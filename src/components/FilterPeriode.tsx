import { useState } from "react";
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
  const [catatan, setCatatan] = useState("");
  const custom = periode === "custom";

  function pilih(k: Periode) {
    setCatatan("");
    if (k === "custom") {
      onChange("custom", from, to);
      return;
    }
    const r = rangeFromPeriode(k);
    onChange(k, r.from, r.to);
  }

  function ubahDari(v: string) {
    if (!v) return;
    if (to && v > to) {
      setCatatan("Tanggal awal tidak boleh melebihi tanggal akhir, jadi tanggal akhir ikut disesuaikan.");
      onChange("custom", v, v);
      return;
    }
    setCatatan("");
    onChange("custom", v, to);
  }

  function ubahSampai(v: string) {
    if (!v) return;
    if (from && v < from) {
      setCatatan("Tanggal akhir tidak boleh sebelum tanggal awal, jadi tanggal awal ikut disesuaikan.");
      onChange("custom", v, v);
      return;
    }
    setCatatan("");
    onChange("custom", from, v);
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" /> Periode
        </div>

        <div
          role="group"
          aria-label="Pilih periode"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-subtle p-1"
        >
          {PERIODE_LABEL.map(([k, label]) => {
            const aktif = periode === k;
            return (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={aktif ? "default" : "ghost"}
                aria-pressed={aktif}
                className={
                  aktif
                    ? "shadow-none"
                    : "bg-transparent text-muted-foreground shadow-none hover:text-foreground"
                }
                onClick={() => pilih(k)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        {custom ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Dari Tanggal
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => ubahDari(e.target.value)}
                className={`${inputClass} w-44`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Sampai Tanggal
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => ubahSampai(e.target.value)}
                className={`${inputClass} w-44`}
              />
            </label>
          </div>
        ) : null}
      </div>

      {catatan ? <p className="mt-2 text-xs text-destructive">{catatan}</p> : null}
    </Panel>
  );
}
