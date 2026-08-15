"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  FileText,
  Pencil,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  updateFinanceEntry,
} from "@/lib/actions/portal";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = f.entries.find((e) => e.id === editingId) ?? null;

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Transparencia financiera"
        title="Resumen Financiero"
        description={`Estado de cuenta consolidado de ${privadaName}.`}
      />

      <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:gap-4 lg:px-6">
        {isAdmin && (
          <form
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
            key={editing?.id ?? "new"}
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = editing
                  ? await updateFinanceEntry(fd)
                  : await createFinanceEntry(fd);
                if (res.error) setMessage(res.error);
                else {
                  setMessage(
                    editing ? "Movimiento actualizado." : "Movimiento registrado.",
                  );
                  setEditingId(null);
                  router.refresh();
                }
              });
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg text-primary-dark">
                {editing ? "Editar movimiento" : "Registrar movimiento"}
              </h3>
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-1 text-sm text-muted"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              )}
            </div>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                name="type"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                defaultValue={editing?.type ?? "INGRESO"}
              >
                <option value="INGRESO">Ingreso</option>
                <option value="GASTO">Gasto</option>
              </select>
              <input
                name="category"
                required
                placeholder="Categoría"
                defaultValue={editing?.category ?? ""}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="description"
                required
                placeholder="Descripción"
                defaultValue={editing?.description ?? ""}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="Monto"
                defaultValue={editing?.amount ?? ""}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editing ? "Guardar cambios" : "Guardar"}
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

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
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

        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="mb-4 font-display text-xl text-primary-dark">
            Movimientos recientes
          </h3>
          <ul className="divide-y divide-border">
            {f.entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary-dark">
                    {e.description}
                  </p>
                  <p className="text-muted">
                    {e.category} ·{" "}
                    {new Date(e.date).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex w-full shrink-0 items-center justify-between gap-1 sm:w-auto sm:justify-start">
                  <span
                    className={`font-semibold ${
                      e.type === "INGRESO" ? "text-success" : "text-danger"
                    }`}
                  >
                    {e.type === "INGRESO" ? "+" : "-"}
                    {formatCurrency(e.amount)}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => {
                          setEditingId(e.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("¿Eliminar este movimiento?")) return;
                          startTransition(async () => {
                            const res = await deleteFinanceEntry(e.id);
                            if (res.error) setMessage(res.error);
                            else {
                              if (editingId === e.id) setEditingId(null);
                              router.refresh();
                            }
                          });
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
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
      className={`min-w-0 rounded-2xl border border-border px-3 py-5 text-center shadow-sm sm:px-6 sm:py-7 ${className}`}
    >
      <div className="mb-3 flex justify-center">{icon}</div>
      <p className={`break-words font-display text-xl font-bold leading-tight sm:text-4xl ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm font-medium leading-tight text-primary-dark sm:text-base">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
