"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Home,
  KeyRound,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import { registerCobranza, setHouseConvenio, voidMonthlyFeePayment, voidPalapaPayment } from "@/lib/actions/portal";
import {
  FEE_ANNUAL_MONTHS,
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  FEE_CONCEPT_LABEL,
  FEE_GRACE_DAYS,
  FEE_LATE_SURCHARGE,
  FEE_PALAPA_AMOUNT,
  FEE_STATUS_LABEL,
  MONTH_LABELS,
  calendarPartsInTijuana,
  feeHasSurcharge,
  feeLabel,
  feeOwedAmount,
  feePeriodRange,
  formatCurrency,
  isFeePaymentLate,
  isFeePeriodBefore,
  nextFeePeriod,
} from "@/lib/utils";

type Fee = {
  id: string;
  year: number;
  month: number;
  amount: number;
  amountPaid?: number;
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
  gateCode,
  fees,
  palapaPayments,
  fines,
  summary,
  isAdmin,
  houseBasePath = "/cuotas",
  initialChargeYear,
  initialChargeMonth,
  hasConvenio = false,
  convenioNotes = null,
}: {
  houseNumber: string;
  houses?: string[];
  houseDirectory?: { houseNumber: string; residents: string[] }[];
  accessCode: string | null;
  gateCode: string | null;
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
  houseBasePath?: string;
  initialChargeYear?: number;
  initialChargeMonth?: number;
  hasConvenio?: boolean;
  convenioNotes?: string | null;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const fromFees = fees.map((f) => f.year);
    const set = new Set([...fromFees, currentYear, currentYear - 1]);
    if (initialChargeYear) set.add(initialChargeYear);
    return [...set].sort((a, b) => b - a);
  }, [fees, currentYear, initialChargeYear]);

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

  const [houseQuery, setHouseQuery] = useState("");
  const [houseMenuOpen, setHouseMenuOpen] = useState(false);
  const houseSearchRef = useRef<HTMLDivElement>(null);

  const filteredHouses = useMemo(() => {
    const q = houseQuery
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (!q) return houseOptions.slice(0, 12);
    return houseOptions
      .filter((h) => {
        const house = h.houseNumber.toLowerCase();
        const names = h.residents
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{M}/gu, "");
        return (
          house.includes(q) ||
          names.includes(q) ||
          `casa ${house}`.includes(q)
        );
      })
      .slice(0, 12);
  }, [houseOptions, houseQuery]);

  useEffect(() => {
    setHouseQuery("");
    setHouseMenuOpen(false);
  }, [houseNumber]);

  useEffect(() => {
    if (!houseMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!houseSearchRef.current?.contains(e.target as Node)) {
        setHouseMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [houseMenuOpen]);

  function selectHouse(next: string) {
    setHouseMenuOpen(false);
    setHouseQuery("");
    if (next === houseNumber) return;
    router.push(`${houseBasePath}?casa=${encodeURIComponent(next)}`, {
      scroll: false,
    });
  }

  const [historyYear, setHistoryYear] = useState(years[0] ?? currentYear);
  const [chargeYear, setChargeYear] = useState(
    initialChargeYear ?? currentYear,
  );
  const [chargeMonth, setChargeMonth] = useState(
    () => initialChargeMonth ?? new Date().getMonth() + 1,
  );
  const [includeMaintenance, setIncludeMaintenance] = useState(true);
  const [includeLate, setIncludeLate] = useState(false);
  const [includePalapa, setIncludePalapa] = useState(false);
  const [chargeMode, setChargeMode] = useState<"periodo" | "abono" | "anual">(
    "periodo",
  );
  const [abonoAmount, setAbonoAmount] = useState(0);
  const [includeAbonoCurrent, setIncludeAbonoCurrent] = useState(false);
  const [includeAbonoNext, setIncludeAbonoNext] = useState(false);
  const [maintenanceAmount, setMaintenanceAmount] = useState(FEE_BASE_AMOUNT);
  const [lateAmount, setLateAmount] = useState(FEE_LATE_SURCHARGE);
  const [palapaAmount, setPalapaAmount] = useState(FEE_PALAPA_AMOUNT);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const abonoMode = chargeMode === "abono";
  const anualMode = chargeMode === "anual";

  useEffect(() => {
    if (initialChargeYear) setChargeYear(initialChargeYear);
    if (initialChargeMonth) setChargeMonth(initialChargeMonth);
  }, [houseNumber, initialChargeYear, initialChargeMonth]);

  useEffect(() => {
    setChargeMode("periodo");
    setIncludeAbonoCurrent(false);
    setIncludeAbonoNext(false);
  }, [houseNumber]);

  const pendingFinesTotal = fines
    .filter((f) => f.status === "PENDIENTE")
    .reduce((sum, f) => sum + f.amount, 0);

  const unpaidFees = useMemo(
    () =>
      fees
        .filter(
          (f) =>
            f.concept === FEE_CONCEPT.MANTENIMIENTO && f.status !== "PAGADO",
        )
        .map((f) => ({
          ...f,
          owed: feeOwedAmount(f),
        }))
        .filter((f) => f.owed > 0)
        .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)),
    [fees],
  );
  const feesDebt = unpaidFees.reduce((s, f) => s + f.owed, 0);
  const totalDebt = feesDebt + pendingFinesTotal;

  const { year: calendarYear, month: calendarMonth } = useMemo(
    () => calendarPartsInTijuana(),
    [],
  );
  const nextCalendar = useMemo(
    () => nextFeePeriod(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  /** Simulación FIFO del abono: qué meses cubre y cuánto queda en cada uno. */
  const abonoPreview = useMemo(() => {
    let remaining = Math.max(0, abonoAmount || 0);
    const lines: {
      year: number;
      month: number;
      owed: number;
      apply: number;
      after: number;
      fullyPaid: boolean;
    }[] = [];
    for (const fee of unpaidFees) {
      if (remaining <= 0) break;
      const apply = Math.min(remaining, fee.owed);
      if (apply <= 0) continue;
      const after = Math.round((fee.owed - apply) * 100) / 100;
      lines.push({
        year: fee.year,
        month: fee.month,
        owed: fee.owed,
        apply,
        after,
        fullyPaid: after <= 0.01,
      });
      remaining = Math.round((remaining - apply) * 100) / 100;
    }
    const covered = lines.reduce((s, l) => s + l.apply, 0);
    const leftoverDebt = Math.max(0, feesDebt - covered);
    return { lines, covered, leftoverDebt, unused: remaining };
  }, [abonoAmount, unpaidFees, feesDebt]);

  function remainingAfterAbono(year: number, month: number) {
    const previewLine = abonoPreview.lines.find(
      (l) => l.year === year && l.month === month,
    );
    if (previewLine) return previewLine.after;
    const fee = fees.find(
      (f) =>
        f.year === year &&
        f.month === month &&
        f.concept === FEE_CONCEPT.MANTENIMIENTO,
    );
    if (fee?.status === "PAGADO") return 0;
    if (fee) return feeOwedAmount(fee);
    return isFeePaymentLate(year, month)
      ? FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE
      : maintenanceAmount;
  }

  const currentAfterAbono = remainingAfterAbono(calendarYear, calendarMonth);
  const nextAfterAbono = remainingAfterAbono(
    nextCalendar.year,
    nextCalendar.month,
  );
  const currentExtra =
    includeAbonoCurrent && currentAfterAbono > 0.01 ? currentAfterAbono : 0;
  const nextExtra =
    includeAbonoNext && nextAfterAbono > 0.01 ? nextAfterAbono : 0;
  const abonoCombinedTotal =
    Math.round((abonoPreview.covered + currentExtra + nextExtra) * 100) / 100;

  useEffect(() => {
    if (feesDebt > 0) setAbonoAmount(feesDebt);
  }, [houseNumber, feesDebt]);

  const annualPeriods = useMemo(
    () => feePeriodRange(chargeYear, chargeMonth, FEE_ANNUAL_MONTHS),
    [chargeYear, chargeMonth],
  );
  const annualEnd = annualPeriods[annualPeriods.length - 1]!;
  const annualToCover = useMemo(() => {
    return annualPeriods.filter((p) => {
      const fee = fees.find(
        (f) =>
          f.year === p.year &&
          f.month === p.month &&
          f.concept === FEE_CONCEPT.MANTENIMIENTO,
      );
      return !fee || fee.status !== "PAGADO";
    });
  }, [annualPeriods, fees]);
  const annualTotal = useMemo(() => {
    return annualToCover.reduce((sum, p) => {
      const fee = fees.find(
        (f) =>
          f.year === p.year &&
          f.month === p.month &&
          f.concept === FEE_CONCEPT.MANTENIMIENTO,
      );
      if (fee && fee.status !== "PAGADO") {
        return sum + feeOwedAmount(fee);
      }
      return (
        sum +
        (isFeePaymentLate(p.year, p.month)
          ? FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE
          : maintenanceAmount)
      );
    }, 0);
  }, [annualToCover, fees, maintenanceAmount]);
  const annualRangeLabel = `${feeLabel(chargeYear, chargeMonth)}–${feeLabel(annualEnd.year, annualEnd.month)}`;

  const months = fees.filter((f) => f.year === historyYear);

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
    !hasConvenio &&
    priorUnpaidFees.length > 0 &&
    (anualMode || (includeMaintenance && !maintenancePaid));

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

  const canCharge = abonoMode
    ? !pending && abonoCombinedTotal > 0
    : anualMode
      ? !pending &&
        !blockedByPriorDebt &&
        annualToCover.length > 0 &&
        annualTotal > 0
      : !pending &&
        !blockedByPriorDebt &&
        total > 0 &&
        ((includeMaintenance && !maintenancePaid) || includePalapa);

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
          <section className="relative z-20 overflow-visible rounded-2xl border-2 border-primary/25 bg-surface shadow-sm">
            <div className="rounded-t-2xl border-b border-border bg-primary-soft/50 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
                Confirmación de casa
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Verifica bien la casa antes de registrar un cobro.
              </p>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6 sm:p-6">
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
                      Sin residentes registrados en esta casa.
                    </p>
                  )}
                  {hasConvenio && (
                    <p className="mt-2 inline-flex rounded-full bg-info-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-info uppercase">
                      Convenio activo
                    </p>
                  )}
                </div>
              </div>

              <div
                ref={houseSearchRef}
                className="relative flex w-full flex-col gap-2 sm:min-w-[280px] sm:max-w-sm"
              >
                <label
                  htmlFor="cobranza-house-search"
                  className="text-sm font-semibold text-primary-dark"
                >
                  Buscar casa o residente
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="cobranza-house-search"
                    type="search"
                    autoComplete="off"
                    value={houseQuery}
                    onChange={(e) => {
                      setHouseQuery(e.target.value);
                      setHouseMenuOpen(true);
                    }}
                    onFocus={() => setHouseMenuOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setHouseMenuOpen(false);
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const first = filteredHouses[0];
                        if (first) selectHouse(first.houseNumber);
                      }
                    }}
                    placeholder="Ej. 21 o Karla"
                    className="min-h-12 w-full rounded-xl border-2 border-primary/30 bg-background py-3 pr-4 pl-10 text-base font-medium text-primary-dark outline-none placeholder:font-normal placeholder:text-muted focus:border-primary"
                    aria-label="Buscar casa por número o nombre"
                    aria-expanded={houseMenuOpen}
                    aria-controls="cobranza-house-results"
                    role="combobox"
                  />
                </div>
                {houseMenuOpen && (
                  <ul
                    id="cobranza-house-results"
                    role="listbox"
                    className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-[0_18px_50px_-16px_rgba(47,29,45,0.55)]"
                  >
                    {filteredHouses.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-muted">
                        Sin coincidencias
                      </li>
                    ) : (
                      filteredHouses.map((h) => {
                        const active = h.houseNumber === houseNumber;
                        return (
                          <li key={h.houseNumber} role="option" aria-selected={active}>
                            <button
                              type="button"
                              onClick={() => selectHouse(h.houseNumber)}
                              className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-primary-soft ${
                                active ? "bg-primary-soft/70" : ""
                              }`}
                            >
                              <span className="text-sm font-semibold text-primary-dark">
                                Casa {h.houseNumber}
                              </span>
                              <span className="text-xs text-muted">
                                {h.residents.length > 0
                                  ? h.residents.join(" · ")
                                  : "Sin residente registrado"}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="border-t border-border px-4 py-4 sm:px-6">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const res = await setHouseConvenio(fd);
                    if (res && "error" in res && res.error) {
                      toast(res.error, "error");
                      return;
                    }
                    toast(
                      fd.get("hasConvenio") === "on"
                        ? "Convenio activado para esta casa."
                        : "Convenio desactivado.",
                      "success",
                    );
                    router.refresh();
                  });
                }}
              >
                <input type="hidden" name="houseNumber" value={houseNumber} />
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="hasConvenio"
                    defaultChecked={hasConvenio}
                    key={`convenio-${houseNumber}-${hasConvenio}`}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-primary-dark">
                      Casa con convenio de pago
                    </span>
                    <span className="text-xs text-muted">
                      Permite cobrar meses atrasados, el mes actual o adelantados
                      sin exigir liquidar primero el adeudo más antiguo.
                    </span>
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-primary-dark">
                    Notas del convenio (opcional)
                  </span>
                  <input
                    name="convenioNotes"
                    defaultValue={convenioNotes ?? ""}
                    key={`notes-${houseNumber}-${convenioNotes ?? ""}`}
                    placeholder="Ej. Acuerdo de 6 meses / contacto…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                >
                  {pending ? "Guardando…" : "Guardar convenio"}
                </button>
              </form>
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
            {(accessCode || gateCode) && (
              <div className="flex flex-col gap-2 sm:items-end">
                {accessCode && (
                  <div className="inline-flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-foreground">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>
                      <span className="font-medium">Peatonal:</span>{" "}
                      {accessCode}
                    </span>
                  </div>
                )}
                {gateCode && (
                  <div className="inline-flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-foreground">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>
                      <span className="font-medium">Portón:</span> {gateCode}
                    </span>
                  </div>
                )}
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

            {totalDebt > 0 && (
              <div className="mb-4 rounded-xl border border-danger/25 bg-danger-soft/50 px-4 py-3">
                <p className="text-xs font-bold tracking-wide text-danger uppercase">
                  Adeudo total
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-danger">
                  {formatCurrency(totalDebt)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {unpaidFees.length} mes
                  {unpaidFees.length === 1 ? "" : "es"} de cuota
                  {feesDebt > 0 ? ` (${formatCurrency(feesDebt)})` : ""}
                  {pendingFinesTotal > 0
                    ? ` · multas ${formatCurrency(pendingFinesTotal)}`
                    : ""}
                </p>
                {unpaidFees.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted">
                    Más antiguo:{" "}
                    {feeLabel(unpaidFees[0].year, unpaidFees[0].month)} ·{" "}
                    {formatCurrency(unpaidFees[0].owed)}
                  </p>
                )}
              </div>
            )}

            {feesDebt > 0 && (
              <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <input
                  type="checkbox"
                  checked={abonoMode}
                  onChange={(e) =>
                    setChargeMode(e.target.checked ? "abono" : "periodo")
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-primary-dark">
                    Registrar abono a cuenta
                  </span>
                  <span className="text-xs text-muted">
                    Desglosa meses del adeudo y, si quieres, suma el mes en curso
                    o el siguiente en el mismo comprobante.
                  </span>
                </span>
              </label>
            )}

            {!abonoMode && (
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <input
                  type="checkbox"
                  checked={anualMode}
                  onChange={(e) =>
                    setChargeMode(e.target.checked ? "anual" : "periodo")
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-primary-dark">
                    Pago anual ({FEE_ANNUAL_MONTHS} meses)
                  </span>
                  <span className="text-xs text-muted">
                    Un solo cobro desde el mes elegido. Cada mes queda marcado
                    como pagado (no hay que registrar mes a mes).
                  </span>
                </span>
              </label>
            )}

            <input type="hidden" name="houseNumber" value={houseNumber} />
            <input type="hidden" name="mode" value={chargeMode} />

            {abonoMode ? (
              <div className="mb-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-primary-dark">
                    Monto del abono a adeudo *
                  </span>
                  <input
                    name="abonoAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={feesDebt}
                    required={feesDebt > 0}
                    value={abonoAmount || ""}
                    onChange={(e) => setAbonoAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>
                <input
                  type="hidden"
                  name="maintenanceAmount"
                  value={maintenanceAmount}
                />
                <p className="text-xs text-muted">
                  Máximo {formatCurrency(feesDebt)} de adeudo. Se aplica del mes
                  más antiguo al más reciente.
                </p>

                {abonoPreview.lines.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="border-b border-border bg-primary-soft/40 px-4 py-2.5">
                      <p className="text-xs font-bold tracking-wide text-primary uppercase">
                        Vista previa — al registrar se aplicará así
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {abonoPreview.lines.filter((l) => l.fullyPaid).length}{" "}
                        se liquidan
                        {abonoPreview.lines.some((l) => !l.fullyPaid)
                          ? ` · ${abonoPreview.lines.filter((l) => !l.fullyPaid).length} parcial`
                          : ""}
                        {" · "}
                        aún no están cobrados
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {abonoPreview.lines.map((line) => (
                        <li
                          key={`${line.year}-${line.month}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary-dark">
                              {feeLabel(line.year, line.month)}
                            </p>
                            <p className="text-xs text-muted">
                              Adeudo actual {formatCurrency(line.owed)}
                              {line.fullyPaid
                                ? " → quedará en $0.00"
                                : ` → quedará ${formatCurrency(line.after)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary-dark">
                              {formatCurrency(line.apply)}
                            </p>
                            <p
                              className={`text-[11px] font-bold tracking-wide uppercase ${
                                line.fullyPaid ? "text-success" : "text-warning"
                              }`}
                            >
                              {line.fullyPaid ? "Se liquida" : "Parcial"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {abonoPreview.leftoverDebt > 0.01 && (
                      <div className="border-t border-border bg-warning-soft/40 px-4 py-2.5 text-xs text-foreground">
                        Tras el abono aún quedará adeudo de cuotas:{" "}
                        <strong>
                          {formatCurrency(abonoPreview.leftoverDebt)}
                        </strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                    Indica un monto de abono, o solo incluye mes en curso /
                    siguiente abajo.
                  </p>
                )}

                <div className="space-y-2 rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-bold tracking-wide text-primary uppercase">
                    Incluir en el mismo cobro
                  </p>
                  <p className="text-xs text-muted">
                    Se suman al total y aparecen en un solo comprobante por
                    correo.
                  </p>
                  <label
                    className={`flex items-start gap-3 rounded-lg px-2 py-2 ${
                      currentAfterAbono <= 0.01
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-primary-soft/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="includeCurrent"
                      checked={includeAbonoCurrent && currentAfterAbono > 0.01}
                      disabled={currentAfterAbono <= 0.01}
                      onChange={(e) =>
                        setIncludeAbonoCurrent(e.target.checked)
                      }
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-primary-dark">
                        Mes en curso ({feeLabel(calendarYear, calendarMonth)})
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {currentAfterAbono <= 0.01
                          ? "Ya queda cubierto con el abono o está pagado."
                          : `+ ${formatCurrency(currentAfterAbono)}`}
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg px-2 py-2 ${
                      nextAfterAbono <= 0.01
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-primary-soft/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="includeNext"
                      checked={includeAbonoNext && nextAfterAbono > 0.01}
                      disabled={nextAfterAbono <= 0.01}
                      onChange={(e) => setIncludeAbonoNext(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-primary-dark">
                        Mes siguiente (
                        {feeLabel(nextCalendar.year, nextCalendar.month)})
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {nextAfterAbono <= 0.01
                          ? "Ya queda cubierto o está pagado."
                          : `+ ${formatCurrency(nextAfterAbono)}`}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="rounded-xl bg-background px-4 py-4">
                  <p className="text-sm text-muted">Total del movimiento</p>
                  <p className="font-display text-3xl font-bold text-primary-dark">
                    {formatCurrency(abonoCombinedTotal)}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {abonoPreview.covered > 0 && (
                      <li>
                        Abono a adeudo: {formatCurrency(abonoPreview.covered)}
                      </li>
                    )}
                    {currentExtra > 0 && (
                      <li>
                        Mes en curso: {formatCurrency(currentExtra)}
                      </li>
                    )}
                    {nextExtra > 0 && (
                      <li>Mes siguiente: {formatCurrency(nextExtra)}</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : anualMode ? (
              <div className="mb-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-primary-dark">
                      Mes de inicio
                    </span>
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
                </div>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-primary-dark">
                    Monto por mes (meses nuevos)
                  </span>
                  <input
                    name="maintenanceAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={maintenanceAmount}
                    onChange={(e) =>
                      setMaintenanceAmount(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Si un mes ya tiene multa cargada, se cobra el saldo de ese
                    mes.
                  </span>
                </label>

                {blockedByPriorDebt && (
                  <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground">
                    Hay adeudos anteriores a{" "}
                    <strong>{feeLabel(chargeYear, chargeMonth)}</strong>:{" "}
                    {priorUnpaidFees
                      .map((f) => feeLabel(f.year, f.month))
                      .join(", ")}
                    . Límpialos o activa un{" "}
                    <strong>convenio</strong> en esta casa.
                  </p>
                )}

                {annualToCover.length === 0 ? (
                  <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
                    Los {FEE_ANNUAL_MONTHS} meses desde{" "}
                    {feeLabel(chargeYear, chargeMonth)} ya están pagados.
                  </p>
                ) : (
                  <div className="rounded-xl bg-background px-4 py-4">
                    <p className="text-sm text-muted">Cobertura</p>
                    <p className="font-medium text-primary-dark">
                      {annualRangeLabel} · {annualToCover.length} mes
                      {annualToCover.length === 1 ? "" : "es"} por registrar
                      {FEE_ANNUAL_MONTHS - annualToCover.length > 0
                        ? ` (${FEE_ANNUAL_MONTHS - annualToCover.length} ya pagados, se omiten)`
                        : ""}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {annualToCover
                        .map((p) => feeLabel(p.year, p.month))
                        .join(" · ")}
                    </p>
                    <p className="mt-3 text-sm text-muted">Total a cobrar</p>
                    <p className="font-display text-3xl font-bold text-primary-dark">
                      {formatCurrency(annualTotal)}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Queda pendiente de validar en Tesorería. En el calendario
                      esos meses aparecen como pagados de inmediato.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                . Cobra el mes más antiguo, usa un abono, o activa un{" "}
                <strong>convenio</strong>.
              </p>
            )}

            {hasConvenio && priorUnpaidFees.length > 0 && !blockedByPriorDebt && (
              <p className="mb-4 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-foreground">
                Convenio activo: puedes cobrar este periodo aunque existan
                adeudos anteriores (
                {priorUnpaidFees
                  .map((f) => feeLabel(f.year, f.month))
                  .join(", ")}
                ).
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
              <p className="mt-2 text-xs text-muted">
                El ingreso quedará pendiente de validar en Tesorería.
              </p>
            </div>
              </>
            )}

            <button
              type="submit"
              disabled={!canCharge}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
            >
              {abonoMode
                ? pending
                  ? "Registrando cobro…"
                  : `Registrar cobro · ${formatCurrency(abonoCombinedTotal)}`
                : anualMode
                  ? blockedByPriorDebt
                    ? "Hay adeudos anteriores — límpialos primero"
                    : annualToCover.length === 0
                      ? "Rango anual ya pagado"
                      : pending
                        ? "Registrando pago anual…"
                        : `Pago anual Casa ${houseNumber} · ${formatCurrency(annualTotal)}`
                  : blockedByPriorDebt
                    ? "Hay adeudos anteriores — usa abono o cobra el mes más antiguo"
                    : maintenancePaid && !includePalapa
                      ? "Periodo ya pagado"
                      : pending
                        ? "Registrando…"
                        : `Cobrar Casa ${houseNumber} · ${formatCurrency(total)}`}
            </button>
            {isAdmin && (
              <p className="mt-2 text-xs text-muted">
                Al registrar el cobro se envía un comprobante por correo. El
                saldo público se actualiza cuando Tesorería valida el ingreso.
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
                className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 ${tone}`}
              >
                <span className="inline-flex min-w-0 flex-col">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {m.status === "PAGADO" ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 shrink-0" />
                    )}
                    {feeLabel(m.year, m.month)}
                  </span>
                  <span className="pl-6 text-xs opacity-80">
                    {FEE_CONCEPT_LABEL[m.concept] ?? m.concept} ·{" "}
                    {formatCurrency(m.amount)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="max-w-[7.5rem] text-right text-[11px] font-bold tracking-wide uppercase">
                    {label}
                  </span>
                  {isAdmin && m.status === "PAGADO" && (
                    <button
                      type="button"
                      title="Anular cobro"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !confirm(
                            `¿Anular el cobro de ${feeLabel(m.year, m.month)}? Si fue parte de un abono o pago anual, se revierten todos los meses del mismo movimiento.`,
                          )
                        ) {
                          return;
                        }
                        startTransition(async () => {
                          const res = await voidMonthlyFeePayment(m.id);
                          if (res.error) toast(res.error, "error");
                          else {
                            toast(
                              res.months && res.months > 1
                                ? `Se anularon ${res.months} meses del mismo cobro.`
                                : "Cobro anulado.",
                            );
                            router.refresh();
                          }
                        });
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/50 text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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
                    <p className="text-xs text-muted">
                      {new Date(payment.paidAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold tabular-nums text-success">
                      {formatCurrency(payment.amount)}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        title="Anular pago de palapa"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !confirm(
                              "¿Anular este pago de palapa y su ingreso en tesorería?",
                            )
                          ) {
                            return;
                          }
                          startTransition(async () => {
                            const res = await voidPalapaPayment(payment.id);
                            if (res.error) toast(res.error, "error");
                            else {
                              toast("Pago de palapa anulado.");
                              router.refresh();
                            }
                          });
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
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
