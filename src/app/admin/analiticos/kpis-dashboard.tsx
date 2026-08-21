import {
  BarChart3,
  Percent,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { CollectionKpis } from "@/lib/kpis";

/** Montos cortos para que quepan en tarjetas de móvil. */
function formatKpiMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function KpisDashboard({ data }: { data: CollectionKpis }) {
  const maxHouses = Math.max(
    80,
    ...data.byMonth.map((m) => m.paid + m.unpaid),
  );
  const maxDebt = Math.max(1, ...data.topDebt.map((h) => h.amount));
  const agingTotal =
    data.aging.current +
    data.aging.late1to2 +
    data.aging.late3to4 +
    data.aging.late5plus;

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-5">
      <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-sm sm:px-4 sm:py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white sm:h-11 sm:w-11">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide text-primary uppercase sm:text-xs">
            Cobranza
          </p>
          <p className="mt-0.5 text-sm leading-snug text-muted sm:text-base">
            Indicadores del periodo ·{" "}
            <span className="font-semibold text-primary-dark">
              {data.rangeLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <KpiCard
          tone="success"
          icon={<Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          value={`${data.collectionRate.toFixed(1)}%`}
          label="Tasa de cobro"
          hint={`${data.paidCount}/${data.totalCount} cuotas`}
          delta={data.collectionRateDelta}
          deltaLabel="mes"
        />
        <KpiCard
          tone="danger"
          icon={<span className="text-xs font-bold sm:text-sm">$</span>}
          value={formatKpiMoney(data.totalDebt)}
          label="Adeudo total"
          hint={`${data.pendingFees} pendientes`}
        />
        <KpiCard
          tone="warning"
          icon={<Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          value={String(data.housesWithDebt)}
          label="Casas adeudo"
          hint={`${data.housesWithDebtPct.toFixed(0)}% de ${data.totalHouses}`}
        />
        <KpiCard
          tone="neutral"
          icon={<ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          value={formatKpiMoney(data.avgDebt)}
          label="Adeudo prom."
          hint="Por casa con adeudo"
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <ChartCard title="Cobro por mes">
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-muted sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1f6b4a]" /> Pagado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#a63d45]" /> Adeudo
            </span>
          </div>
          <MonthBars months={data.byMonth} max={maxHouses} />
        </ChartCard>
        <ChartCard title="Morosidad">
          <AgingDonut aging={data.aging} total={agingTotal} />
        </ChartCard>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        <ChartCard title="Tendencia de cobro">
          <RateTrend months={data.byMonth} />
        </ChartCard>
        <ChartCard title="Mayor adeudo por casa">
          <DebtRanking houses={data.topDebt} maxDebt={maxDebt} />
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({
  tone,
  icon,
  value,
  label,
  hint,
  delta,
  deltaLabel,
}: {
  tone: "success" | "danger" | "warning" | "neutral";
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
  delta?: number | null;
  deltaLabel?: string;
}) {
  const tones = {
    success: "bg-success-soft border-success/35",
    danger: "bg-danger-soft border-danger/35",
    warning: "bg-warning-soft border-warning/40",
    neutral: "bg-primary-soft/60 border-primary/25",
  };
  const iconTones = {
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-white",
    neutral: "bg-primary text-white",
  };
  const valueTones = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-[#8a5a10]",
    neutral: "text-primary-dark",
  };

  return (
    <div
      className={`min-w-0 rounded-2xl border-2 px-3 py-3 shadow-sm sm:px-4 sm:py-4 ${tones[tone]}`}
    >
      <div className="mb-2 flex items-start justify-between gap-1.5 sm:mb-3 sm:gap-2">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 ${iconTones[tone]}`}
        >
          {icon}
        </span>
        {delta != null && Number.isFinite(delta) ? (
          <span
            className={`max-w-[70%] truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:max-w-none sm:px-2 sm:text-xs ${
              delta < 0
                ? "bg-white/80 text-danger"
                : delta > 0
                  ? "bg-white/80 text-success"
                  : "bg-white/80 text-muted"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
            {deltaLabel ? ` ${deltaLabel}` : ""}
          </span>
        ) : null}
      </div>
      <p
        className={`font-display text-[1.35rem] leading-none tracking-tight break-words sm:text-3xl ${valueTones[tone]}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs font-bold text-primary-dark sm:mt-2 sm:text-sm">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted sm:text-xs">
        {hint}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
      <h3 className="mb-3 font-display text-lg text-primary-dark sm:mb-4 sm:text-xl">
        {title}
      </h3>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function MonthBars({
  months,
  max,
}: {
  months: CollectionKpis["byMonth"];
  max: number;
}) {
  const w = 360;
  const h = 200;
  const pad = { l: 28, r: 4, t: 10, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 1.2;
  const barW = months.length === 0 ? 0 : innerW / months.length - gap;
  const ticks = [0, 20, 40, 60, 80].filter((n) => n <= max);

  return (
    <div className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Cobro por mes"
      >
        {ticks.map((tick) => {
          const y = pad.t + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="#e8ddd3"
                strokeDasharray="3 4"
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted"
                fontSize="9"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const x = pad.l + i * (barW + gap);
          const unpaidH = (m.unpaid / max) * innerH;
          const paidH = (m.paid / max) * innerH;
          const showLabel =
            months.length <= 8 ||
            i % 4 === 0 ||
            i === months.length - 1;
          return (
            <g key={m.key}>
              <title>
                {m.label}: {m.paid} pagadas, {m.unpaid} adeudo
              </title>
              <rect
                x={x}
                y={pad.t + innerH - unpaidH}
                width={Math.max(barW, 1)}
                height={unpaidH}
                fill="#a63d45"
                rx="1"
              />
              <rect
                x={x}
                y={pad.t + innerH - unpaidH - paidH}
                width={Math.max(barW, 1)}
                height={paidH}
                fill="#1f6b4a"
                rx="1"
              />
              {showLabel ? (
                <text
                  x={x + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  className="fill-muted"
                  fontSize="8"
                >
                  {m.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AgingDonut({
  aging,
  total,
}: {
  aging: CollectionKpis["aging"];
  total: number;
}) {
  const slices = [
    { key: "Al corriente", value: aging.current, color: "#1f6b4a" },
    { key: "1-2 meses", value: aging.late1to2, color: "#c9a227" },
    { key: "3-4 meses", value: aging.late3to4, color: "#b07820" },
    { key: "5+ meses", value: aging.late5plus, color: "#a63d45" },
  ].filter((s) => s.value > 0 || total === 0);

  const r = 58;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <svg viewBox="0 0 160 160" className="h-36 w-36 sm:h-44 sm:w-44">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="#efe8e0"
          strokeWidth="22"
        />
        {total === 0
          ? null
          : slices.map((s) => {
              const len = (s.value / total) * c;
              const dash = `${len} ${c - len}`;
              const el = (
                <circle
                  key={s.key}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="22"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 80 80)"
                />
              );
              offset += len;
              return el;
            })}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-primary-dark"
          fontSize="22"
          fontFamily="Georgia, serif"
        >
          {total}
        </text>
        <text
          x="80"
          y="94"
          textAnchor="middle"
          className="fill-muted"
          fontSize="10"
        >
          casas
        </text>
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-muted sm:flex sm:flex-wrap sm:justify-center sm:gap-x-4 sm:text-xs">
        {slices.map((s) => (
          <li key={s.key} className="inline-flex min-w-0 items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="truncate">
              {s.key} ({s.value})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RateTrend({ months }: { months: CollectionKpis["byMonth"] }) {
  const w = 360;
  const h = 200;
  const pad = { l: 32, r: 6, t: 12, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = months.map((m, i) => {
    const x =
      pad.l +
      (months.length <= 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
    const y = pad.t + innerH - (m.rate / 100) * innerH;
    return `${x},${y}`;
  });
  const area = pts.length
    ? `${pad.l},${pad.t + innerH} ${pts.join(" ")} ${pad.l + innerW},${pad.t + innerH}`
    : "";

  return (
    <div className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tendencia de tasa de cobro"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = pad.t + innerH - (tick / 100) * innerH;
          return (
            <g key={tick}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="#e8ddd3"
                strokeDasharray="3 4"
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted"
                fontSize="9"
              >
                {tick}%
              </text>
            </g>
          );
        })}
        {area ? (
          <polygon points={area} fill="#4f334a" fillOpacity="0.12" />
        ) : null}
        {pts.length ? (
          <polyline
            points={pts.join(" ")}
            fill="none"
            stroke="#4f334a"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {months.map((m, i) =>
          months.length <= 8 || i % 4 === 0 || i === months.length - 1 ? (
            <text
              key={m.key}
              x={
                pad.l +
                (months.length <= 1
                  ? innerW / 2
                  : (i / (months.length - 1)) * innerW)
              }
              y={h - 8}
              textAnchor="middle"
              className="fill-muted"
              fontSize="8"
            >
              {m.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function DebtRanking({
  houses,
  maxDebt,
}: {
  houses: CollectionKpis["topDebt"];
  maxDebt: number;
}) {
  if (houses.length === 0) {
    return <p className="text-sm text-muted">No hay casas con adeudo.</p>;
  }

  return (
    <ol className="space-y-3">
      {houses.map((h) => (
        <li key={h.houseNumber} className="min-w-0">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  h.rank <= 3
                    ? "bg-danger-soft text-danger"
                    : "bg-primary-soft text-muted"
                }`}
              >
                {h.rank}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary-dark">
                  Casa {h.houseNumber}
                </p>
                <p className="truncate text-[11px] text-muted sm:text-xs">
                  {h.unpaidMonths} de {h.totalMonths} meses
                  {h.name ? ` · ${h.name}` : ""}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-sm font-bold text-danger tabular-nums">
              {formatKpiMoney(h.amount)}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-danger-soft">
            <div
              className="h-full rounded-full bg-danger"
              style={{ width: `${Math.max(4, (h.amount / maxDebt) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
