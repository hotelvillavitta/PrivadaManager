"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Home,
  KeyRound,
  Receipt,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import { registerCobranza } from "@/lib/actions/portal";
import {
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  FEE_CONCEPT_LABEL,
  FEE_GRACE_DAYS,
  FEE_LATE_SURCHARGE,
  FEE_PALAPA_AMOUNT,
  MONTH_LABELS,
  feeLabel,
  formatCurrency,
  isFeePaymentLate,
} from "@/lib/utils";

type Fee = {
  id: string;
  year: number;
  month: number;
  amount: number;
  concept: string;
  status: "PAGADO" | "ADEUDO" | "PENDIENTE";
};

type PalapaPayment = {
  id: string;
  amount: number;
  paidAt: string;
};

type FineRow = {
  id: string;
  category: string;
  cause: string;
  regulationArticle: string;
  regulationExcerpt: string;
  amount: number;
  status: "PENDIENTE" | "PAGADO" | "ANULADA";
  notes: string | null;
  issuedAt: string;
  paidAt: string | null;
};

export function CuotasClient({
  houseNumber,
  houses = [],
  accessCode,
  fees,
  palapaPayments,
  fines,
  summary,
  isAdmin,
}: {
  houseNumber: string;
  houses?: string[];
  accessCode: string | null;
  fees: Fee[];
  palapaPayments: PalapaPayment[];
  fines: FineRow[];
  summary: { paid: number; debt: number; pendingAmount: number };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const fromFees = fees.map((f) => f.year);
    const set = new Set([...fromFees, currentYear, currentYear - 1]);
    return [...set].sort((a, b) => b - a);
  }, [fees, currentYear]);

  const [historyYear, setHistoryYear] = useState(years[0] ?? currentYear);
  const [chargeYear, setChargeYear] = useState(currentYear);
  const [chargeMonth, setChargeMonth] = useState(() => new Date().getMonth() + 1);
  const [includeMaintenance, setIncludeMaintenance] = useState(true);
  const [includeLate, setIncludeLate] = useState(false);
  const [includePalapa, setIncludePalapa] = useState(false);
  const [maintenanceAmount, setMaintenanceAmount] = useState(FEE_BASE_AMOUNT);
  const [lateAmount, setLateAmount] = useState(FEE_LATE_SURCHARGE);
  const [palapaAmount, setPalapaAmount] = useState(FEE_PALAPA_AMOUNT);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const months = fees.filter((f) => f.year === historyYear);

  const maintenanceFee = fees.find(
    (f) =>
      f.year === chargeYear &&
      f.month === chargeMonth &&
      f.concept === FEE_CONCEPT.MANTENIMIENTO,
  );
  const maintenancePaid = maintenanceFee?.status === "PAGADO";
  const suggestedLate = isFeePaymentLate(chargeYear, chargeMonth);

  useEffect(() => {
    if (maintenancePaid) {
      // El periodo seleccionado define el estado inicial del formulario.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIncludeMaintenance(false);
      setIncludeLate(false);
    } else {
      setIncludeMaintenance(true);
      setIncludeLate(suggestedLate);
      setMaintenanceAmount(FEE_BASE_AMOUNT);
      setLateAmount(FEE_LATE_SURCHARGE);
    }
  }, [houseNumber, chargeYear, chargeMonth, maintenancePaid, suggestedLate]);

  const total =
    (includeMaintenance && !maintenancePaid ? maintenanceAmount : 0) +
    (includeMaintenance && includeLate && !maintenancePaid ? lateAmount : 0) +
    (includePalapa ? palapaAmount : 0);

  const conceptSummary = [
    includeMaintenance && !maintenancePaid
      ? FEE_CONCEPT_LABEL.MANTENIMIENTO
      : null,
    includeMaintenance && includeLate && !maintenancePaid
      ? `Recargo (después del día ${FEE_GRACE_DAYS})`
      : null,
    includePalapa ? FEE_CONCEPT_LABEL.PALAPA : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const canCharge =
    !pending &&
    total > 0 &&
    ((includeMaintenance && !maintenancePaid) ||
      includePalapa);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Área financiera"
        title={isAdmin ? "Cobranza de cuotas" : "Cuotas de mantenimiento"}
        description={
          isAdmin
            ? `Mantenimiento ${formatCurrency(FEE_BASE_AMOUNT)}. El uso de palapa (${formatCurrency(FEE_PALAPA_AMOUNT)}) es un cargo independiente y puede registrarse cada vez que se use. Recargo ${formatCurrency(FEE_LATE_SURCHARGE)} después del día ${FEE_GRACE_DAYS}.`
            : `Consulta tu historial. Cuota mensual ${formatCurrency(FEE_BASE_AMOUNT)}.`
        }
      />

      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:space-y-6 lg:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary-dark">
                Casa #{houseNumber}
              </p>
              <p className="text-sm text-muted">
                {isAdmin
                  ? "Selecciona la casa a cobrar."
                  : "Historial de cuotas de tu casa."}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {isAdmin && houses.length > 0 && (
              <label className="flex flex-col gap-1 text-sm sm:items-end">
                <span className="font-medium text-primary-dark">Casa</span>
                <select
                  value={houseNumber}
                  onChange={(e) =>
                    router.push(`/cuotas?casa=${e.target.value}`)
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {houses.map((h) => (
                    <option key={h} value={h}>
                      Casa {h}
                    </option>
                  ))}
                </select>
              </label>
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

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            icon={<Check className="h-5 w-5" />}
            value={String(summary.paid)}
            label="Pagos registrados"
          />
          <StatCard
            icon={<X className="h-5 w-5" />}
            value={String(summary.debt)}
            label="Con adeudo"
          />
          <StatCard
            icon={<ArrowUpRight className="h-5 w-5" />}
            value={
              summary.pendingAmount === 0
                ? "Al corriente"
                : formatCurrency(summary.pendingAmount)
            }
            label="Total pendiente"
          />
        </div>

        {isAdmin && (
          <form
            className="rounded-2xl border border-border bg-surface p-4 sm:p-6"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = await registerCobranza(fd);
                if (res.error) {
                  setMessage(res.error);
                  toast(res.error, "error");
                } else {
                  const amt =
                    "amount" in res && typeof res.amount === "number"
                      ? formatCurrency(res.amount)
                      : "";
                  setMessage(`Cobro registrado${amt ? ` · ${amt}` : ""}.`);
                  toast(`Cobro registrado${amt ? `: ${amt}` : ""}.`);
                  router.refresh();
                }
              });
            }}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl text-primary-dark">
                  Registrar cobro · Casa {houseNumber}
                </h3>
                <p className="text-sm text-muted">
                  Elige periodo y conceptos. Los montos se pueden ajustar.
                </p>
              </div>
            </div>

            <input type="hidden" name="houseNumber" value={houseNumber} />

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-primary-dark">Año</span>
                <input
                  name="year"
                  type="number"
                  value={chargeYear}
                  onChange={(e) => setChargeYear(Number(e.target.value))}
                  required
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-primary-dark">Mes</span>
                <select
                  name="month"
                  value={chargeMonth}
                  onChange={(e) => setChargeMonth(Number(e.target.value))}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {MONTH_LABELS.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label} ({idx + 1})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {maintenancePaid && (
              <div className="mb-4 space-y-2">
                {maintenancePaid && (
                  <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success">
                    Mantenimiento {feeLabel(chargeYear, chargeMonth)}:{" "}
                    <strong>PAGADO</strong> ({formatCurrency(maintenanceFee!.amount)}).
                    No se puede duplicar.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <ConceptRow
                checked={includeMaintenance && !maintenancePaid}
                disabled={maintenancePaid}
                onCheckedChange={setIncludeMaintenance}
                name="includeMaintenance"
                title={FEE_CONCEPT_LABEL.MANTENIMIENTO}
                amountName="maintenanceAmount"
                amount={maintenanceAmount}
                onAmountChange={setMaintenanceAmount}
                amountDisabled={maintenancePaid || !includeMaintenance}
              />
              <ConceptRow
                checked={includeLate && includeMaintenance && !maintenancePaid}
                disabled={maintenancePaid || !includeMaintenance}
                onCheckedChange={setIncludeLate}
                name="includeLate"
                title={`Recargo / rezago (después del día ${FEE_GRACE_DAYS})`}
                hint={
                  suggestedLate
                    ? "Sugerido: el periodo ya pasó el día 10."
                    : "Opcional. Actívalo si aplica rezago."
                }
                amountName="lateAmount"
                amount={lateAmount}
                onAmountChange={setLateAmount}
                amountDisabled={
                  maintenancePaid || !includeMaintenance || !includeLate
                }
              />
              <ConceptRow
                checked={includePalapa}
                onCheckedChange={setIncludePalapa}
                name="includePalapa"
                title={FEE_CONCEPT_LABEL.PALAPA}
                amountName="palapaAmount"
                amount={palapaAmount}
                onAmountChange={setPalapaAmount}
                amountDisabled={!includePalapa}
              />
            </div>

            <div className="mt-5 rounded-xl bg-background px-4 py-4">
              <p className="text-sm text-muted">Concepto</p>
              <p className="font-medium text-primary-dark">
                {conceptSummary || "Sin conceptos seleccionados"}
              </p>
              <p className="mt-3 text-sm text-muted">Total a cobrar</p>
              <p className="font-display text-3xl font-bold text-primary-dark">
                {formatCurrency(total)}
              </p>
            </div>

            <button
              type="submit"
              disabled={!canCharge}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {maintenancePaid && !includePalapa
                ? "Periodo ya pagado"
                : pending
                  ? "Registrando…"
                  : `Registrar cobro · ${formatCurrency(total)}`}
            </button>
            {isAdmin && (
              <p className="mt-2 text-xs text-muted">
                Al registrar el cobro se envía un comprobante por correo a los
                residentes de esa casa.
              </p>
            )}
            {message && <p className="mt-2 text-sm text-muted">{message}</p>}
          </form>
        )}

        {!isAdmin && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            Tu historial lo actualiza el comité. Cuando registren un pago,
            aparecerá aquí, en Finanzas, y recibirás el comprobante por correo.
          </p>
        )}

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 font-display text-2xl text-primary-dark">
            Historial de cuotas de mantenimiento
          </h2>
          <p className="mb-4 text-sm text-muted">
            Incluye únicamente mantenimiento y sus recargos. Los usos de
            palapa se muestran por separado.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setHistoryYear(y)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  historyYear === y
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
                <span className="inline-flex flex-col">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Check className="h-4 w-4" />
                    {feeLabel(m.year, m.month)}
                  </span>
                  <span className="pl-6 text-xs opacity-80">
                    {FEE_CONCEPT_LABEL[m.concept] ?? m.concept} ·{" "}
                    {formatCurrency(m.amount)}
                  </span>
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

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="font-display text-2xl text-primary-dark">
              Pagos por uso de palapa
            </h2>
            <p className="mt-1 text-sm text-muted">
              Cada uso se registra por separado; puede haber varios pagos en
              el mismo mes.
            </p>
          </div>
          {palapaPayments.length === 0 ? (
            <p className="rounded-xl bg-background px-4 py-3 text-sm text-muted">
              Aún no hay pagos de palapa registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {palapaPayments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-primary-dark">
                      Uso de palapa
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(payment.paidAt).toLocaleDateString("es-MX", {
                        dateStyle: "long",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-success">
                    {formatCurrency(payment.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="multas"
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-2xl text-primary-dark">
              Multas y sanciones
            </h2>
            <p className="mt-1 text-sm text-muted">
              Faltas al reglamento aplicadas por el comité. El pago lo registra
              la administración; no bloquea el uso de la app.
            </p>
          </div>
          {fines.length === 0 ? (
            <p className="rounded-xl bg-background px-4 py-3 text-sm text-muted">
              No hay multas registradas para esta casa.
            </p>
          ) : (
            <ul className="space-y-3">
              {fines.map((fine) => (
                <li
                  key={fine.id}
                  className={`rounded-xl border px-4 py-3 ${
                    fine.status === "PENDIENTE"
                      ? "border-warning/30 bg-warning-soft/40"
                      : fine.status === "PAGADO"
                        ? "border-success/20 bg-success-soft/30"
                        : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary-dark">
                        {fine.cause}
                      </p>
                      <p className="text-sm text-muted">
                        {fine.category} · {fine.regulationArticle}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Emitida{" "}
                        {new Date(fine.issuedAt).toLocaleDateString("es-MX", {
                          dateStyle: "medium",
                        })}
                        {fine.paidAt
                          ? ` · Pagada ${new Date(fine.paidAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}`
                          : ""}
                      </p>
                      {fine.notes && (
                        <p className="mt-1 text-xs text-muted">
                          Notas: {fine.notes}
                        </p>
                      )}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-primary">
                          Ver extracto del reglamento
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted">
                          {fine.regulationExcerpt}
                        </p>
                      </details>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-primary-dark">
                        {formatCurrency(fine.amount)}
                      </p>
                      <p
                        className={`text-xs font-bold uppercase ${
                          fine.status === "PENDIENTE"
                            ? "text-warning"
                            : fine.status === "PAGADO"
                              ? "text-success"
                              : "text-muted"
                        }`}
                      >
                        {fine.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ConceptRow({
  checked,
  disabled,
  onCheckedChange,
  name,
  title,
  hint,
  amountName,
  amount,
  onAmountChange,
  amountDisabled,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
  name: string;
  title: string;
  hint?: string;
  amountName: string;
  amount: number;
  onAmountChange: (v: number) => void;
  amountDisabled?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        disabled
          ? "border-border/60 bg-background/60 opacity-70"
          : checked
            ? "border-primary/30 bg-primary-soft/40"
            : "border-border bg-background"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name={name}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="font-medium text-primary-dark">{title}</span>
            {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:justify-end">
          <span className="text-muted">Monto</span>
          <input
            name={amountName}
            type="number"
            min={0}
            step="1"
            value={amount}
            readOnly={amountDisabled}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-right text-sm read-only:opacity-60"
          />
        </label>
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
    <div className="min-w-0 rounded-2xl border border-success/20 bg-success-soft px-2.5 py-3 text-success sm:px-5 sm:py-4">
      <div className="mb-1.5 [&>svg]:h-4 [&>svg]:w-4 sm:mb-2 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{icon}</div>
      <p className="break-words font-display text-lg font-bold leading-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight opacity-80 sm:text-sm">{label}</p>
    </div>
  );
}
