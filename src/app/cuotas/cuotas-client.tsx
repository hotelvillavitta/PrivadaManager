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
  FEE_STATUS_LABEL,
  MONTH_LABELS,
  feeHasSurcharge,
  feeLabel,
  formatCurrency,
  isFeePaymentLate,
  isFeePeriodBefore,
} from "@/lib/utils";

type Fee = {
  id: string;
  year: number;
  month: number;
  amount: number;
  concept: string;
  status: "PAGADO" | "ADEUDO" | "PENDIENTE";
  withSurcharge?: boolean;
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
  billingYear: number;
  billingMonth: number;
};

export function CuotasClient({
  houseNumber,
  houses = [],
  houseDirectory = [],
  accessCode,
  fees,
  palapaPayments,
  fines,
  summary,
  isAdmin,
}: {
  houseNumber: string;
  houses?: string[];
  houseDirectory?: { houseNumber: string; residents: string[] }[];
  accessCode: string | null;
  fees: Fee[];
  palapaPayments: PalapaPayment[];
  fines: FineRow[];
  summary: {
    paid: number;
    debt: number;
    pendingAmount: number;
    dueFeesAmount?: number;
    pendingFinesAmount?: number;
  };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const fromFees = fees.map((f) => f.year);
    const set = new Set([...fromFees, currentYear, currentYear - 1]);
    return [...set].sort((a, b) => b - a);
  }, [fees, currentYear]);

  const houseOptions = useMemo(() => {
    const byHouse = new Map(
      houseDirectory.map((h) => [h.houseNumber, h] as const),
    );
    const numbers = houses.length
      ? houses
      : houseDirectory.map((h) => h.houseNumber);
    return numbers
      .map(
        (h) =>
          byHouse.get(h) ?? {
            houseNumber: h,
            residents: [] as string[],
          },
      )
      .sort((a, b) => {
        const na = Number(a.houseNumber);
        const nb = Number(b.houseNumber);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.houseNumber.localeCompare(b.houseNumber, "es");
      });
  }, [houseDirectory, houses]);

  const selectedHouse = useMemo(
    () =>
      houseOptions.find((h) => h.houseNumber === houseNumber) ?? {
        houseNumber,
        residents: [] as string[],
      },
    [houseOptions, houseNumber],
  );

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

  const pendingFinesTotal = fines
    .filter((f) => f.status === "PENDIENTE")
    .reduce((sum, f) => sum + f.amount, 0);
  // Si el servidor aún no suma multas futuras, el cliente las incluye.
  const pendingAmountToShow =
    summary.pendingAmount > 0
      ? summary.pendingAmount
      : pendingFinesTotal;
  const dueFeesAmount = summary.dueFeesAmount ?? 0;
  const onlyFinesPending =
    pendingAmountToShow > 0 && dueFeesAmount === 0 && pendingFinesTotal > 0;
  const hasFeeAndFinePending =
    pendingAmountToShow > 0 && dueFeesAmount > 0 && pendingFinesTotal > 0;

  const maintenanceFee = fees.find(
    (f) =>
      f.year === chargeYear &&
      f.month === chargeMonth &&
      f.concept === FEE_CONCEPT.MANTENIMIENTO,
  );
  const maintenancePaid = maintenanceFee?.status === "PAGADO";
  const suggestedLate = isFeePaymentLate(chargeYear, chargeMonth);
  const periodFines = fines.filter(
    (f) =>
      f.status === "PENDIENTE" &&
      f.billingYear === chargeYear &&
      f.billingMonth === chargeMonth,
  );
  const periodFinesTotal = periodFines.reduce((sum, f) => sum + f.amount, 0);
  const suggestedMaintenance = FEE_BASE_AMOUNT + periodFinesTotal;
  const priorUnpaidFees = fees
    .filter(
      (f) =>
        f.concept === FEE_CONCEPT.MANTENIMIENTO &&
        f.status !== "PAGADO" &&
        isFeePeriodBefore(
          { year: f.year, month: f.month },
          { year: chargeYear, month: chargeMonth },
        ),
    )
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
  const blockedByPriorDebt =
    includeMaintenance && !maintenancePaid && priorUnpaidFees.length > 0;

  useEffect(() => {
    if (maintenancePaid) {
      // El periodo seleccionado define el estado inicial del formulario.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIncludeMaintenance(false);
      setIncludeLate(false);
    } else {
      setIncludeMaintenance(true);
      setIncludeLate(suggestedLate);
      setMaintenanceAmount(suggestedMaintenance);
      setLateAmount(FEE_LATE_SURCHARGE);
    }
  }, [
    houseNumber,
    chargeYear,
    chargeMonth,
    maintenancePaid,
    suggestedLate,
    suggestedMaintenance,
  ]);

  const total =
    (includeMaintenance && !maintenancePaid ? maintenanceAmount : 0) +
    (includeMaintenance && includeLate && !maintenancePaid ? lateAmount : 0) +
    (includePalapa ? palapaAmount : 0);

  const conceptSummary = [
    includeMaintenance && !maintenancePaid
      ? periodFinesTotal > 0
        ? `${FEE_CONCEPT_LABEL.MANTENIMIENTO} + multas`
        : FEE_CONCEPT_LABEL.MANTENIMIENTO
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
    !blockedByPriorDebt &&
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
            ? `Mantenimiento ${formatCurrency(FEE_BASE_AMOUNT)}. Las multas se suman a la cuota del periodo. Palapa ${formatCurrency(FEE_PALAPA_AMOUNT)} es independiente. Recargo ${formatCurrency(FEE_LATE_SURCHARGE)} después del día ${FEE_GRACE_DAYS}.`
            : `Consulta tu historial. Cuota mensual ${formatCurrency(FEE_BASE_AMOUNT)}. Las multas se incorporan a la cuota del periodo.`
        }
      />

      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:space-y-6 lg:px-6">
        {isAdmin ? (
          <section className="overflow-hidden rounded-2xl border-2 border-primary/25 bg-surface shadow-sm">
            <div className="border-b border-border bg-primary-soft/50 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
                Confirmación de casa
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Verifica bien la casa antes de registrar un cobro.
              </p>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm sm:h-20 sm:w-20">
                  <Home className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted">
                    Casa seleccionada
                  </p>
                  <p className="font-display text-4xl font-bold leading-none text-primary-dark sm:text-5xl">
                    {houseNumber}
                  </p>
                  {selectedHouse.residents.length > 0 ? (
                    <p className="mt-2 text-sm leading-snug text-foreground">
                      <span className="font-semibold text-primary-dark">
                        Residentes:
                      </span>{" "}
                      {selectedHouse.residents.join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      Sin residentes COLONO registrados en esta casa.
                    </p>
                  )}
                </div>
              </div>

              <label className="flex w-full flex-col gap-2 sm:min-w-[220px]">
                <span className="text-sm font-semibold text-primary-dark">
                  Cambiar casa
                </span>
                <select
                  value={houseNumber}
                  onChange={(e) =>
                    router.push(`/cuotas?casa=${e.target.value}`, {
                      scroll: false,
                    })
                  }
                  className="min-h-12 w-full rounded-xl border-2 border-primary/30 bg-background px-4 py-3 text-base font-semibold text-primary-dark outline-none focus:border-primary"
                  aria-label="Seleccionar casa a cobrar"
                >
                  {houseOptions.map((h) => (
                    <option key={h.houseNumber} value={h.houseNumber}>
                      Casa {h.houseNumber}
                      {h.residents[0] ? ` — ${h.residents[0]}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ) : (
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
                  Historial de cuotas de tu casa.
                </p>
              </div>
            </div>
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
        )}

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
              pendingAmountToShow === 0
                ? "Al corriente"
                : formatCurrency(pendingAmountToShow)
            }
            label={
              pendingAmountToShow === 0
                ? "Total pendiente"
                : onlyFinesPending
                  ? "Multa pendiente"
                  : hasFeeAndFinePending
                    ? "Cuota + multa pendiente"
                    : "Total pendiente"
            }
            tone={
              pendingAmountToShow === 0
                ? "success"
                : onlyFinesPending
                  ? "warning"
                  : "danger"
            }
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
                  Registrar cobro
                </h3>
                <p className="text-sm text-muted">
                  Elige periodo y conceptos. Los montos se pueden ajustar.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-primary/25 bg-primary-soft/40 px-4 py-3">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">
                Cobro dirigido a
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-primary-dark">
                Casa {houseNumber}
              </p>
              {selectedHouse.residents.length > 0 && (
                <p className="mt-1 text-sm text-foreground">
                  {selectedHouse.residents.join(" · ")}
                </p>
              )}
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

            {blockedByPriorDebt && (
              <p className="mb-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground">
                No puedes cobrar{" "}
                <strong>{feeLabel(chargeYear, chargeMonth)}</strong> mientras
                haya adeudos anteriores:{" "}
                {priorUnpaidFees
                  .map((f) => feeLabel(f.year, f.month))
                  .join(", ")}
                . Cobra primero el mes más antiguo.
              </p>
            )}

            <div className="space-y-3">
              <ConceptRow
                checked={includeMaintenance && !maintenancePaid}
                disabled={maintenancePaid}
                onCheckedChange={setIncludeMaintenance}
                name="includeMaintenance"
                title={
                  periodFinesTotal > 0
                    ? `${FEE_CONCEPT_LABEL.MANTENIMIENTO} + multas (${formatCurrency(periodFinesTotal)})`
                    : FEE_CONCEPT_LABEL.MANTENIMIENTO
                }
                hint={
                  periodFinesTotal > 0
                    ? `${periodFines.length} multa(s) pendientes en ${feeLabel(chargeYear, chargeMonth)}.`
                    : undefined
                }
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
              <p className="mt-3 text-sm text-muted">Casa</p>
              <p className="font-display text-2xl font-bold text-primary-dark">
                {houseNumber}
              </p>
              <p className="mt-3 text-sm text-muted">Total a cobrar</p>
              <p className="font-display text-3xl font-bold text-primary-dark">
                {formatCurrency(total)}
              </p>
            </div>

            <button
              type="submit"
              disabled={!canCharge}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
            >
              {blockedByPriorDebt
                ? "Hay adeudos anteriores"
                : maintenancePaid && !includePalapa
                  ? "Periodo ya pagado"
                  : pending
                    ? "Registrando…"
                    : `Cobrar Casa ${houseNumber} · ${formatCurrency(total)}`}
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
          <div className="mb-5 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              Pagado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Pagado con recargo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
              Adeudo (sin cobro)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              Pendiente
            </span>
          </div>
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
            {months.map((m) => {
              const surcharge = feeHasSurcharge(m);
              const tone =
                m.status === "PAGADO"
                  ? surcharge
                    ? "bg-accent/15 text-accent"
                    : "bg-success-soft text-success"
                  : m.status === "ADEUDO"
                    ? "bg-danger-soft text-danger"
                    : "bg-warning-soft text-warning";
              const label = surcharge
                ? "Pagado con recargo"
                : (FEE_STATUS_LABEL[m.status] ?? m.status);
              return (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${tone}`}
              >
                <span className="inline-flex flex-col">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {m.status === "PAGADO" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    {feeLabel(m.year, m.month)}
                  </span>
                  <span className="pl-6 text-xs opacity-80">
                    {FEE_CONCEPT_LABEL[m.concept] ?? m.concept} ·{" "}
                    {formatCurrency(m.amount)}
                  </span>
                </span>
                <span className="max-w-[7.5rem] text-right text-[11px] font-bold tracking-wide uppercase">
                  {label}
                </span>
              </div>
              );
            })}
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
              Cada multa se suma a la cuota del mes con adeudo más antiguo del
              residente. Se liquida al pagar esa cuota (no se cobra en un mes
              futuro si aún debe el actual o anteriores).
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
                        Se suma a cuota{" "}
                        {feeLabel(fine.billingYear, fine.billingMonth)} ·
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
  tone = "success",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning/20 bg-warning-soft text-warning"
      : tone === "danger"
        ? "border-danger/20 bg-danger-soft text-danger"
        : "border-success/20 bg-success-soft text-success";

  return (
    <div
      className={`min-w-0 rounded-2xl border px-2.5 py-3 sm:px-5 sm:py-4 ${toneClass}`}
    >
      <div className="mb-1.5 [&>svg]:h-4 [&>svg]:w-4 sm:mb-2 sm:[&>svg]:h-5 sm:[&>svg]:w-5">
        {icon}
      </div>
      <p className="break-words font-display text-lg font-bold leading-tight sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium leading-tight opacity-80 sm:text-sm">
        {label}
      </p>
    </div>
  );
}
