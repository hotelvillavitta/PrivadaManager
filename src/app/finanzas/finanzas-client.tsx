"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  FileText,
  Receipt,
  Wallet,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { createFinanceEntry } from "@/lib/actions/portal";
import { formatCurrency } from "@/lib/utils";

type Summary = {
  liquidez: number;
  ingresosMes: number;
  ingresosTotales: number;
  gastosMes: number;
  gastosTotales: number;
  pagosRegistrados: number;
  gastosRegistrados: number;
  balanceNetoMes: number;
  entries: {
    id: string;
    type: string;
    category: string;
    description: string;
    amount: number;
    date: string;
  }[];
};

export function FinanzasClient({
  summary,
  privadaName,
  isAdmin,
}: {
  summary: Summary;
  privadaName: string;
  isAdmin: boolean;
}) {
  const f = summary;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Transparencia financiera"
        title="Resumen Financiero"
        description={`Estado de cuenta consolidado de ${privadaName}.`}
      />

      <div className="mx-auto grid max-w-6xl gap-4 px-4 lg:px-6">
        {isAdmin && (
          <form
            className="rounded-2xl border border-border bg-surface p-5"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = await createFinanceEntry(fd);
                if (res.error) setMessage(res.error);
                else {
                  setMessage("Movimiento registrado.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-3 font-display text-lg text-primary-dark">
              Registrar movimiento
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                name="type"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                defaultValue="INGRESO"
              >
                <option value="INGRESO">Ingreso</option>
                <option value="GASTO">Gasto</option>
              </select>
              <input
                name="category"
                required
                placeholder="Categoría"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="description"
                required
                placeholder="Descripción"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="Monto"
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

        <MetricCard
          className="border-success/25 bg-success-soft"
          icon={<Wallet className="h-6 w-6 text-success" />}
          value={formatCurrency(f.liquidez)}
          valueClass="text-success"
          title="Liquidez Total de la Privada"
          subtitle="Ingresos totales menos gastos totales"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            className="border-success/20 bg-success-soft/70"
            icon={<ArrowUpRight className="h-5 w-5 text-success" />}
            value={formatCurrency(f.ingresosMes)}
            valueClass="text-success"
            title="Ingresos del Mes"
          />
          <MetricCard
            className="bg-surface"
            icon={<span className="text-lg font-bold text-primary">$</span>}
            value={formatCurrency(f.ingresosTotales)}
            title="Ingresos Totales"
          />
          <MetricCard
            className="border-danger/20 bg-danger-soft/70"
            icon={<ArrowDownRight className="h-5 w-5 text-danger" />}
            value={formatCurrency(f.gastosMes)}
            valueClass="text-danger"
            title="Gastos del Mes"
          />
          <MetricCard
            className="bg-surface"
            icon={<Building2 className="h-5 w-5 text-primary" />}
            value={formatCurrency(f.gastosTotales)}
            title="Gastos Totales"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            className="border-info/20 bg-info-soft/80"
            icon={<FileText className="h-5 w-5 text-info" />}
            value={String(f.pagosRegistrados)}
            valueClass="text-info"
            title="Pagos Registrados"
          />
          <MetricCard
            className="border-warning/20 bg-warning-soft/80"
            icon={<Receipt className="h-5 w-5 text-warning" />}
            value={String(f.gastosRegistrados)}
            valueClass="text-warning"
            title="Gastos Registrados"
          />
          <MetricCard
            className="border-success/20 bg-success-soft/80"
            icon={<Wallet className="h-5 w-5 text-success" />}
            value={formatCurrency(f.balanceNetoMes)}
            valueClass="text-success"
            title="Balance Neto del Mes"
          />
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-display text-xl text-primary-dark">
            Movimientos recientes
          </h3>
          <ul className="divide-y divide-border">
            {f.entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-primary-dark">
                    {e.description}
                  </p>
                  <p className="text-muted">
                    {e.category} ·{" "}
                    {new Date(e.date).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    e.type === "INGRESO" ? "text-success" : "text-danger"
                  }`}
                >
                  {e.type === "INGRESO" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  className = "",
  icon,
  value,
  valueClass = "text-primary-dark",
  title,
  subtitle,
}: {
  className?: string;
  icon: React.ReactNode;
  value: string;
  valueClass?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border px-6 py-7 text-center shadow-sm ${className}`}
    >
      <div className="mb-3 flex justify-center">{icon}</div>
      <p className={`font-display text-3xl font-bold sm:text-4xl ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 font-medium text-primary-dark">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
