"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { CollectionKpis } from "@/lib/kpis";

type MonthRow = CollectionKpis["byMonth"][number];

function yearRate(months: MonthRow[]) {
  const paid = months.reduce((s, m) => s + m.paid, 0);
  const unpaid = months.reduce((s, m) => s + m.unpaid, 0);
  const total = paid + unpaid;
  return total === 0 ? 0 : (paid / total) * 100;
}

/** Acordeón año → meses con % de cobro (estilo Residex). */
export function CollectionProgressByYear({
  months,
}: {
  months: MonthRow[];
}) {
  const byYear = useMemo(() => {
    const map = new Map<number, MonthRow[]>();
    for (const m of months) {
      const list = map.get(m.year) ?? [];
      list.push(m);
      map.set(m.year, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, list]) => ({
        year,
        months: list.sort((a, b) => a.key - b.key),
        rate: yearRate(list),
      }));
  }, [months]);

  const [openYear, setOpenYear] = useState<number | null>(
    () => byYear.at(-1)?.year ?? null,
  );

  if (byYear.length === 0) {
    return (
      <p className="text-sm text-muted">Aún no hay datos de cobro mensuales.</p>
    );
  }

  return (
    <div className="space-y-2">
      {byYear.map(({ year, months: yearMonths, rate }) => {
        const open = openYear === year;
        return (
          <div
            key={year}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <button
              type="button"
              onClick={() => setOpenYear(open ? null : year)}
              className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition hover:bg-background/80 sm:px-4"
              aria-expanded={open}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarDays className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-primary-dark">
                  {year}
                </span>
                <span className="text-xs text-muted">
                  {yearMonths.length} mes
                  {yearMonths.length === 1 ? "" : "es"}
                </span>
              </span>
              <span className="text-sm font-bold text-success tabular-nums">
                {rate.toFixed(0)}%
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div className="border-t border-border bg-background/50 px-3 py-3 sm:px-4">
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {yearMonths.map((m) => {
                    const billed = m.paid + m.unpaid;
                    return (
                      <div
                        key={m.key}
                        className="rounded-xl border border-border bg-surface p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-primary-dark">
                            {m.label}
                          </p>
                          <p className="text-sm font-bold text-success tabular-nums">
                            {m.rate.toFixed(0)}%
                          </p>
                        </div>
                        <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-success-soft">
                          <div
                            className="h-full rounded-full bg-success transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, m.rate))}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted">
                          <span className="font-semibold text-success">
                            {m.paid} pagados
                          </span>
                          {" · "}
                          <span className="font-semibold text-danger">
                            {m.unpaid} pendientes
                          </span>
                          {billed > 0 ? ` · ${billed} casas` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
