"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Home,
  KeyRound,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { upsertMonthlyFee } from "@/lib/actions/portal";
import { feeLabel, formatCurrency } from "@/lib/utils";

type Fee = {
  id: string;
  year: number;
  month: number;
  amount: number;
  status: "PAGADO" | "ADEUDO" | "PENDIENTE";
};

export function CuotasClient({
  houseNumber,
  houses = [],
  accessCode,
  fees,
  summary,
  isAdmin,
}: {
  houseNumber: string;
  houses?: string[];
  accessCode: string | null;
  fees: Fee[];
  summary: { paid: number; debt: number; pendingAmount: number };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const years = useMemo(
    () => [...new Set(fees.map((f) => f.year))].sort((a, b) => b - a),
    [fees],
  );
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const months = fees.filter((f) => f.year === year);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Área financiera"
        title="Cuotas de Mantenimiento"
        description="Consulta tu historial de pagos y saldos pendientes."
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary-dark">
                Casa #{houseNumber}
              </p>
              <p className="text-sm text-muted">
                Historial de cuotas de mantenimiento.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {isAdmin && houses.length > 0 && (
              <select
                value={houseNumber}
                onChange={(e) => router.push(`/cuotas?casa=${e.target.value}`)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {houses.map((h) => (
                  <option key={h} value={h}>
                    Casa {h}
                  </option>
                ))}
              </select>
            )}
            {accessCode && (
              <div className="inline-flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-foreground">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  <span className="font-medium">Clave de acceso:</span>{" "}
                  {accessCode}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Check className="h-5 w-5" />}
            value={String(summary.paid)}
            label="Meses Pagados"
          />
          <StatCard
            icon={<X className="h-5 w-5" />}
            value={String(summary.debt)}
            label="Meses con Adeudo"
          />
          <StatCard
            icon={<ArrowUpRight className="h-5 w-5" />}
            value={
              summary.pendingAmount === 0
                ? "Al corriente"
                : formatCurrency(summary.pendingAmount)
            }
            label="Total Pendiente"
          />
        </div>

        {isAdmin && (
          <form
            className="rounded-2xl border border-border bg-surface p-5"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = await upsertMonthlyFee(fd);
                if (res.error) setMessage(res.error);
                else {
                  setMessage("Cuota actualizada.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-3 font-display text-lg text-primary-dark">
              Registrar / actualizar cuota
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input
                name="houseNumber"
                defaultValue={houseNumber}
                placeholder="Casa"
                required
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="year"
                type="number"
                defaultValue={year}
                required
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="month"
                type="number"
                min={1}
                max={12}
                defaultValue={new Date().getMonth() + 1}
                required
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                name="status"
                defaultValue="PAGADO"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="PAGADO">PAGADO</option>
                <option value="ADEUDO">ADEUDO</option>
                <option value="PENDIENTE">PENDIENTE</option>
              </select>
              <input
                name="amount"
                type="number"
                defaultValue={1500}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar
            </button>
            {message && <p className="mt-2 text-sm text-muted">{message}</p>}
          </form>
        )}

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-display text-2xl text-primary-dark">
            Historial de Pagos
          </h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  year === y
                    ? "bg-border text-primary-dark"
                    : "bg-background text-muted hover:bg-border/60"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {months.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  m.status === "PAGADO"
                    ? "bg-success-soft text-success"
                    : m.status === "ADEUDO"
                      ? "bg-danger-soft text-danger"
                      : "bg-warning-soft text-warning"
                }`}
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4" />
                  {feeLabel(m.year, m.month)}
                </span>
                <span className="text-xs font-bold tracking-wide uppercase">
                  {m.status}
                </span>
              </div>
            ))}
            {months.length === 0 && (
              <p className="col-span-full text-sm text-muted">
                No hay registros para este año.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-success/20 bg-success-soft px-5 py-4 text-success">
      <div className="mb-2">{icon}</div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-medium opacity-80">{label}</p>
    </div>
  );
}
