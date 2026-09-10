"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Filter,
  Search,
  Upload,
  Wallet,
} from "lucide-react";
import { toast } from "@/components/Toast";
import {
  confirmFeesImport,
  exportFeesWorkbook,
  previewFeesImport,
  type FeeImportPreview,
} from "@/lib/actions/fees";
import { formatCurrency } from "@/lib/utils";
import {
  unpaidForPeriods,
  type PaymentMatrix,
  type PaymentMatrixRow,
} from "@/lib/fees/matrix-shared";

type Props = {
  matrix: PaymentMatrix;
};

function houseMatchesQuery(houseNumber: string, q: string) {
  const lower = houseNumber.toLowerCase();
  if (lower.includes(q)) return true;
  const nq = Number(q);
  const nh = Number(houseNumber);
  if (!Number.isNaN(nq) && !Number.isNaN(nh) && nq === nh) return true;
  return false;
}

export function CobranzaMatrixClient({ matrix }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [houseQuery, setHouseQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "adeudo" | "al_corriente"
  >("todos");
  const [yearFilter, setYearFilter] = useState<number | "todos">("todos");
  const [preview, setPreview] = useState<FeeImportPreview | null>(null);
  const [applyPayload, setApplyPayload] = useState("");

  const years = useMemo(() => {
    const set = new Set(matrix.periods.map((p) => p.year));
    return [...set].sort((a, b) => b - a);
  }, [matrix.periods]);

  const visiblePeriods = useMemo(() => {
    if (yearFilter === "todos") return matrix.periods;
    return matrix.periods.filter((p) => p.year === yearFilter);
  }, [matrix.periods, yearFilter]);

  const enrichedRows = useMemo(() => {
    return matrix.rows.map((row) => {
      const scoped = unpaidForPeriods(row.cells, visiblePeriods);
      return { ...row, ...scoped };
    });
  }, [matrix.rows, visiblePeriods]);

  const rows = useMemo(() => {
    const q = houseQuery.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      if (statusFilter === "adeudo" && row.unpaidCount === 0) return false;
      if (statusFilter === "al_corriente" && row.unpaidCount > 0) return false;
      if (!q) return true;
      if (houseMatchesQuery(row.houseNumber, q)) return true;
      return row.residents.some((r) => r.toLowerCase().includes(q));
    });
  }, [enrichedRows, houseQuery, statusFilter]);

  const summary = useMemo(() => {
    let withDebt = 0;
    let totalDebt = 0;
    for (const row of rows) {
      if (row.unpaidCount > 0) {
        withDebt += 1;
        totalDebt += row.unpaidAmount;
      }
    }
    return { withDebt, totalDebt };
  }, [rows]);

  function onImportFile(file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const res = await previewFeesImport(fd);
      if ("error" in res) {
        toast(res.error, "error");
        setPreview(null);
        setApplyPayload("");
        return;
      }
      setPreview(res);
      setApplyPayload(res.applyPayload);
      toast(
        `Vista previa: ${res.insert} nuevos, ${res.update} cambios, ${res.unchanged} iguales.`,
      );
    });
  }

  function applyImport() {
    if (!applyPayload) return;
    startTransition(async () => {
      const res = await confirmFeesImport(applyPayload);
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      toast(`Importación aplicada: ${res.written} registros.`);
      setPreview(null);
      setApplyPayload("");
      router.refresh();
    });
  }

  function onExport() {
    startTransition(async () => {
      const res = await exportFeesWorkbook();
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast("Concentrado descargado.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-primary-dark">
              Calendario de pagos
            </h2>
            <p className="mt-1 text-sm text-muted">
              Desde {matrix.startLabel} · {matrix.rangeLabel} ·{" "}
              {matrix.rows.length} casas · clic en adeudo para cobrar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary-dark">
              <Upload className="h-3.5 w-3.5" />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={pending}
                onChange={(e) => {
                  onImportFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar XLSX
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={houseQuery}
              onChange={(e) => setHouseQuery(e.target.value)}
              placeholder="Buscar por casa o residente…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos los estatus</option>
            <option value="adeudo">Con adeudo</option>
            <option value="al_corriente">Al corriente</option>
          </select>
          <select
            value={yearFilter === "todos" ? "todos" : String(yearFilter)}
            onChange={(e) =>
              setYearFilter(
                e.target.value === "todos" ? "todos" : Number(e.target.value),
              )
            }
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos los años</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <p className="font-semibold text-primary-dark">
            Vista filtrada: {rows.length} casas
          </p>
          <p className="text-danger">
            Con adeudo: {summary.withDebt} · Total:{" "}
            {formatCurrency(summary.totalDebt)}
          </p>
          {yearFilter !== "todos" && (
            <p className="text-muted">Totales solo de {yearFilter}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Leyenda:
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-success-soft px-1.5 py-0.5 font-bold text-success">
              ✓
            </span>{" "}
            Pagado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-danger-soft px-1.5 py-0.5 font-bold text-danger">
              $
            </span>{" "}
            Adeudo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-warning-soft px-1.5 py-0.5 font-bold text-warning">
              ?
            </span>{" "}
            Sin registro
          </span>
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
          <p className="font-semibold text-primary-dark">
            Vista previa de importación
          </p>
          <p className="mt-1 text-sm text-muted">
            {preview.insert} insertar · {preview.update} actualizar ·{" "}
            {preview.unchanged} sin cambio · {preview.houses} casas ·{" "}
            {preview.periods} meses
          </p>
          {preview.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-warning">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !applyPayload}
              onClick={applyImport}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirmar upsert
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setApplyPayload("");
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-max border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 border-b border-r border-border bg-primary-soft px-3 py-2 text-left font-semibold text-primary-dark">
                  Casa
                </th>
                {visiblePeriods.map((p) => (
                  <th
                    key={p.key}
                    className="sticky top-0 z-20 border-b border-border bg-primary-soft px-2 py-2 text-center font-semibold text-primary-dark"
                  >
                    {p.label}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-border bg-primary-soft px-3 py-2 text-right font-semibold text-primary-dark">
                  Adeudo
                  {yearFilter !== "todos" ? ` ${yearFilter}` : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: PaymentMatrixRow) => (
                <tr key={row.houseNumber} className="hover:bg-background/70">
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-1.5">
                    <div className="min-w-[7rem]">
                      <p className="font-bold text-primary-dark">
                        {row.houseNumber}
                      </p>
                      {row.residents[0] ? (
                        <p className="max-w-[9rem] truncate text-[10px] text-muted">
                          {row.residents[0]}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  {visiblePeriods.map((p) => {
                    const cell = row.cells.find(
                      (c) => c.year === p.year && c.month === p.month,
                    );
                    if (!cell || cell.status === "FUTURO") {
                      return (
                        <td
                          key={`${row.houseNumber}-${p.key}`}
                          className="border-b border-border px-1 py-1 text-center text-muted"
                        >
                          ·
                        </td>
                      );
                    }
                    if (cell.status === "PAGADO") {
                      return (
                        <td
                          key={`${row.houseNumber}-${p.key}`}
                          className="border-b border-border px-1 py-1 text-center"
                          title={
                            cell.withSurcharge
                              ? `Pagado con recargo · ${formatCurrency(cell.amount)}`
                              : `Pagado · ${formatCurrency(cell.amount)}`
                          }
                        >
                          <span
                            className={`inline-flex min-w-[2.25rem] justify-center rounded px-1.5 py-0.5 font-bold ${
                              cell.withSurcharge
                                ? "bg-accent/15 text-accent"
                                : "bg-success-soft text-success"
                            }`}
                          >
                            ✓
                          </span>
                        </td>
                      );
                    }
                    const unpaid =
                      cell.status === "ADEUDO" ||
                      cell.status === "PENDIENTE" ||
                      cell.status === "SIN_REGISTRO";
                    return (
                      <td
                        key={`${row.houseNumber}-${p.key}`}
                        className="border-b border-border px-1 py-1 text-center"
                      >
                        {unpaid ? (
                          <Link
                            href={`/admin/cobranza?casa=${encodeURIComponent(row.houseNumber)}&anio=${cell.year}&mes=${cell.month}`}
                            className={`inline-flex min-w-[2.75rem] justify-center rounded px-1.5 py-0.5 font-bold ${
                              cell.status === "SIN_REGISTRO"
                                ? "bg-warning-soft text-warning"
                                : "bg-danger-soft text-danger"
                            }`}
                            title={`Cobrar ${cell.label} · Casa ${row.houseNumber}`}
                          >
                            {cell.status === "SIN_REGISTRO"
                              ? "?"
                              : `$${Math.round(cell.amount)}`}
                          </Link>
                        ) : (
                          <span className="text-muted">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-border px-3 py-1.5 text-right font-semibold tabular-nums text-danger">
                    {row.unpaidAmount > 0
                      ? formatCurrency(row.unpaidAmount)
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={visiblePeriods.length + 2}
                    className="px-4 py-8 text-center text-sm text-muted"
                  >
                    No hay casas con ese filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted">
        <Wallet className="mr-1 inline h-3.5 w-3.5" />
        Mostrando {rows.length} de {matrix.rows.length} casas
        {yearFilter !== "todos" ? ` · año ${yearFilter}` : ""}.
      </p>
    </div>
  );
}
