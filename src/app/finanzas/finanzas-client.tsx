"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Check,
  FileText,
  Pencil,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import {
  approveFinanceEntry,
  createFinanceEntry,
  deleteFinanceEntry,
  rejectPendingFinanceEntry,
  updateFinanceEntry,
  updatePendingFinanceEntry,
} from "@/lib/actions/portal";
import { formatCurrency } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Limpieza",
  "Seguridad",
  "Agua",
  "Luz",
  "Reparación",
  "Mantenimiento",
  "Internet",
  "Otro",
];

const INCOME_CATEGORIES = [
  "Cuotas",
  "Palapa",
  "Multas",
  "Donativo",
  "Otro",
];

type Summary = {
  liquidez: number;
  ingresosMes: number;
  ingresosTotales: number;
  gastosMes: number;
  gastosTotales: number;
  pagosRegistrados: number;
  gastosRegistrados: number;
  balanceNetoMes: number;
  pendingApprovals?: number;
};

type LedgerEntry = {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  linked: boolean;
  status?: "PENDING" | "APPROVED";
};

export function FinanzasClient({
  summary,
  privadaName,
  isAdmin,
  entries = [],
  pendingEntries = [],
}: {
  summary: Summary;
  privadaName: string;
  isAdmin: boolean;
  entries?: LedgerEntry[];
  pendingEntries?: LedgerEntry[];
  houses?: string[];
}) {
  const f = summary;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<
    "resumen" | "aprobar" | "ingreso" | "gasto" | "historial"
  >(isAdmin ? (pendingEntries.length ? "aprobar" : "gasto") : "resumen");
  const [typeFilter, setTypeFilter] = useState<"todos" | "INGRESO" | "GASTO">(
    "todos",
  );
  const [editing, setEditing] = useState<LedgerEntry | null>(null);

  const filteredEntries = useMemo(() => {
    if (typeFilter === "todos") return entries;
    return entries.filter((e) => e.type === typeFilter);
  }, [entries, typeFilter]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Transparencia financiera"
        title={isAdmin ? "Tesorería" : "Resumen Financiero"}
        description={
          isAdmin
            ? `Valida ingresos de cobranza, registra egresos e ingresos manuales de ${privadaName}.`
            : `Estado de cuenta consolidado de ${privadaName}.`
        }
      />

      <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:gap-4 lg:px-6">
        {isAdmin && (
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-sm">
            {(
              [
                ["aprobar", `Por aprobar${pendingEntries.length ? ` (${pendingEntries.length})` : ""}`],
                ["ingreso", "Registrar ingreso"],
                ["gasto", "Registrar gasto"],
                ["historial", "Historial"],
                ["resumen", "Resumen"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === key
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isAdmin && tab === "aprobar" && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <h3 className="font-display text-xl text-primary-dark">
              Ingresos pendientes de validar
            </h3>
            <p className="mt-1 text-sm text-muted">
              Cobros de cuotas, abonos y palapa aparecen aquí. Puedes ajustar el
              monto o la categoría antes de publicarlos al saldo de la privada.
            </p>

            {pendingEntries.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No hay ingresos por aprobar.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {pendingEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-warning/30 bg-warning-soft/40 p-3 sm:p-4"
                  >
                    {editing?.id === e.id ? (
                      <form
                        className="grid gap-2 sm:grid-cols-2"
                        action={(fd) => {
                          startTransition(async () => {
                            const res = await updatePendingFinanceEntry(fd);
                            if (res.error) toast(res.error, "error");
                            else {
                              toast("Pendiente actualizado.");
                              setEditing(null);
                              router.refresh();
                            }
                          });
                        }}
                      >
                        <input type="hidden" name="id" value={e.id} />
                        <select
                          name="category"
                          defaultValue={e.category}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        >
                          {INCOME_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          defaultValue={e.amount}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                          name="description"
                          required
                          defaultValue={e.description}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                        />
                        <input
                          name="date"
                          type="date"
                          defaultValue={(() => {
                            const d = new Date(e.date);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          })()}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <button
                            type="submit"
                            disabled={pending}
                            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-xl border border-border px-3 py-2 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-primary-dark">
                            {e.description}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {e.category} ·{" "}
                            {new Date(e.date).toLocaleDateString("es-MX")}
                          </p>
                          <p className="mt-1 text-lg font-bold text-warning tabular-nums">
                            {formatCurrency(e.amount)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(e)}
                            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              startTransition(async () => {
                                const res = await approveFinanceEntry(e.id);
                                if (res.error) toast(res.error, "error");
                                else {
                                  toast("Ingreso publicado en el saldo.");
                                  router.refresh();
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-success px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" /> Validar
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              if (
                                !confirm(
                                  "¿Descartar este pendiente y revertir el cobro vinculado (cuotas/palapa)?",
                                )
                              )
                                return;
                              startTransition(async () => {
                                const res = await rejectPendingFinanceEntry(
                                  e.id,
                                );
                                if (res.error) toast(res.error, "error");
                                else {
                                  toast("Pendiente descartado y cobro revertido.");
                                  router.refresh();
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Descartar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isAdmin && tab === "ingreso" && (
          <form
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
            action={(fd) => {
              startTransition(async () => {
                const res = await createFinanceEntry(fd);
                if (res.error) toast(res.error, "error");
                else {
                  toast("Ingreso registrado y publicado.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-1 font-display text-xl text-primary-dark">
              Registrar ingreso manual
            </h3>
            <p className="mb-4 text-sm text-muted">
              Ingresos mensuales u otros conceptos que no vienen de cobranza. Se
              publican de inmediato en el saldo.
            </p>
            <input type="hidden" name="type" value="INGRESO" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Descripción *
                </span>
                <input
                  name="description"
                  required
                  placeholder="Ej. Aportación extraordinaria comité"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Categoría
                </span>
                <select
                  name="category"
                  defaultValue="Otro"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Monto *
                </span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Fecha
                </span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Notas
                </span>
                <input
                  name="notes"
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Publicar ingreso
            </button>
          </form>
        )}

        {isAdmin && tab === "gasto" && (
          <form
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
            action={(fd) => {
              startTransition(async () => {
                const res = await createFinanceEntry(fd);
                if (res.error) toast(res.error, "error");
                else {
                  toast("Gasto registrado.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-1 font-display text-xl text-primary-dark">
              Registrar nuevo gasto
            </h3>
            <p className="mb-4 text-sm text-muted">
              Se resta del saldo visible para todos los residentes al
              registrarlo.
            </p>
            <input type="hidden" name="type" value="GASTO" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Descripción *
                </span>
                <input
                  name="description"
                  required
                  placeholder="Ej. Pago de luz del mes de abril"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Categoría
                </span>
                <select
                  name="category"
                  defaultValue="Otro"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Monto *
                </span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Fecha del gasto
                </span>
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-primary-dark">
                  Referencia / notas
                </span>
                <input
                  name="notes"
                  placeholder="Factura, proveedor…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Registrar gasto
            </button>
          </form>
        )}

        {isAdmin && tab === "historial" && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl text-primary-dark">
                Historial publicado
              </h3>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as typeof typeFilter)
                }
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="GASTO">Gastos</option>
              </select>
            </div>

            {editing && editing.status !== "PENDING" && (
              <form
                className="mb-4 rounded-xl border border-primary/25 bg-primary-soft/40 p-4"
                action={(fd) => {
                  startTransition(async () => {
                    const res = await updateFinanceEntry(fd);
                    if (res.error) toast(res.error, "error");
                    else {
                      toast("Movimiento actualizado.");
                      setEditing(null);
                      router.refresh();
                    }
                  });
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary-dark">
                    Editar movimiento
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input type="hidden" name="id" value={editing.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    name="type"
                    defaultValue={editing.type}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="INGRESO">Ingreso</option>
                    <option value="GASTO">Gasto</option>
                  </select>
                  <input
                    name="category"
                    required
                    defaultValue={editing.category}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    name="description"
                    required
                    defaultValue={editing.description}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editing.amount}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    name="date"
                    type="date"
                    defaultValue={(() => {
                      const d = new Date(editing.date);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })()}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Guardar cambios
                </button>
              </form>
            )}

            {filteredEntries.length === 0 ? (
              <p className="text-sm text-muted">No hay movimientos publicados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className="py-2 pr-2 font-semibold">Fecha</th>
                      <th className="py-2 pr-2 font-semibold">Descripción</th>
                      <th className="py-2 pr-2 font-semibold">Categoría</th>
                      <th className="py-2 pr-2 font-semibold">Tipo</th>
                      <th className="py-2 pr-2 text-right font-semibold">Monto</th>
                      <th className="py-2 pl-2 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e) => (
                      <tr key={e.id} className="border-b border-border/70">
                        <td className="py-2.5 pr-2 whitespace-nowrap text-muted">
                          {new Date(e.date).toLocaleDateString("es-MX")}
                        </td>
                        <td className="py-2.5 pr-2 text-primary-dark">
                          {e.description}
                        </td>
                        <td className="py-2.5 pr-2 text-muted">{e.category}</td>
                        <td className="py-2.5 pr-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              e.type === "INGRESO"
                                ? "bg-success-soft text-success"
                                : "bg-danger-soft text-danger"
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 pr-2 text-right font-semibold tabular-nums ${
                            e.type === "INGRESO" ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="py-2.5 pl-2">
                          <div className="flex gap-1">
                            {!e.linked && (
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => setEditing(e)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              title={
                                e.linked
                                  ? "Eliminar y revertir cobro ligado"
                                  : "Eliminar"
                              }
                              disabled={pending}
                              onClick={() => {
                                const msg = e.linked
                                  ? "¿Eliminar este movimiento y revertir el cobro ligado (cuota/palapa/multa)?"
                                  : "¿Eliminar este movimiento?";
                                if (!confirm(msg)) return;
                                startTransition(async () => {
                                  const res = await deleteFinanceEntry(e.id);
                                  if (res.error) toast(res.error, "error");
                                  else {
                                    toast(
                                      e.linked
                                        ? "Movimiento eliminado y cobro revertido."
                                        : "Movimiento eliminado.",
                                    );
                                    router.refresh();
                                  }
                                });
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {(tab === "resumen" || !isAdmin) && (
          <>
            <MetricCard
              className="border-success/25 bg-success-soft"
              icon={<Wallet className="h-6 w-6 text-success" />}
              value={formatCurrency(f.liquidez)}
              valueClass="text-success"
              title="Liquidez Total de la Privada"
              subtitle="Solo ingresos validados menos gastos"
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
                title="Ingresos publicados"
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
          </>
        )}
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
      <p
        className={`break-words font-display text-xl font-bold leading-tight sm:text-4xl ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-medium leading-tight text-primary-dark sm:text-base">
        {title}
      </p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
