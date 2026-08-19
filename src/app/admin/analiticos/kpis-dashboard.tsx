import {
  BarChart3,
  Percent,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { CollectionKpis } from "@/lib/kpis";
import { formatCurrency } from "@/lib/utils";

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
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-3xl text-primary-dark sm:text-4xl">
            Analíticos y KPIs
          </h2>
          <p className="mt-1 text-sm text-muted">
            Indicadores clave de cobranza de la privada · {data.rangeLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          tone="success"
          icon={<Percent className="h-4 w-4" />}
          value={`${data.collectionRate.toFixed(1)}%`}
          label="Tasa de cobro"
          hint={`${data.paidCount} de ${data.totalCount} cuotas`}
          delta={data.collectionRateDelta}
          deltaLabel="último mes"
        />
        <KpiCard
          tone="danger"
          icon={<span className="text-sm font-bold">$</span>}
          value={formatCurrency(data.totalDebt)}
          label="Adeudo total"
          hint={`${data.pendingFees} cuotas pendientes`}
        />
        <KpiCard
          tone="warning"
          icon={<Users className="h-4 w-4" />}
          value={String(data.housesWithDebt)}
          label="Casas con adeudo"
          hint={`De ${data.totalHouses} casas (${data.housesWithDebtPct.toFixed(0)}%)`}
        />
        <KpiCard
          tone="neutral"
          icon={<ShieldAlert className="h-4 w-4" />}
          value={formatCurrency(data.avgDebt)}
          label="Adeudo promedio"
          hint="Por casa con adeudo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <ChartCard title="Cobro por mes">
          <MonthBars months={data.byMonth} max={maxHouses} />
        </ChartCard>
        <ChartCard title="Distribución de morosidad">
          <AgingDonut aging={data.aging} total={agingTotal} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Tendencia de tasa de cobro">
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
    success: "bg-success-soft/70 border-success/15",
    danger: "bg-danger-soft/70 border-danger/15",
    warning: "bg-warning-soft/70 border-warning/20",
    neutral: "bg-surface border-border",
  };
  const iconTones = {
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-white",
    neutral: "bg-primary-soft text-primary",
  };

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${tones[tone]}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${iconTones[tone]}`}
        >
          {icon}
        </span>
        {delta != null && Number.isFinite(delta) ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              delta < 0
                ? "bg-danger-soft text-danger"
                : delta > 0
                  ? "bg-success-soft text-success"
                  : "bg-primary-soft text-muted"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} pts
            {deltaLabel ? ` · ${deltaLabel}` : ""}
          </span>
        ) : null}
      </div>
      <p className="font-display text-3xl text-primary-dark">{value}</p>
      <p className="mt-1 text-sm font-semibold text-primary-dark">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
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
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 font-display text-xl text-primary-dark">{title}</h3>
      {children}
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
  const w = 720;
  const h = 220;
  const pad = { l: 36, r: 8, t: 12, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 1.5;
  const barW = months.length === 0 ? 0 : innerW / months.length - gap;
  const ticks = [0, 20, 40, 60, 80].filter((n) => n <= max);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[640px] w-full">
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
                x={pad.l - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted"
                fontSize="10"
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
          const showLabel = i % 5 === 4 || i === 0 || i === months.length - 1;
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
                  y={h - 10}
                  textAnchor="middle"
                  className="fill-muted"
                  fontSize="9"
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
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-44 w-44">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="#efe8e0"
          strokeWidth="22"
        />
        {total === 0 ? null : (
          slices.map((s) => {
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
          })
        )}
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
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        {slices.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />
            {s.key} ({s.value})
          </li>
        ))}
      </ul>
    </div>
  );
}

function RateTrend({ months }: { months: CollectionKpis["byMonth"] }) {
  const w = 640;
  const h = 220;
  const pad = { l: 40, r: 10, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = months.map((m, i) => {
    const x =
      pad.l + (months.length <= 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
    const y = pad.t + innerH - (m.rate / 100) * innerH;
    return `${x},${y}`;
  });
  const area = pts.length
    ? `${pad.l},${pad.t + innerH} ${pts.join(" ")} ${pad.l + innerW},${pad.t + innerH}`
    : "";

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[560px] w-full">
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
                x={pad.l - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted"
                fontSize="10"
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
          i % 5 === 4 || i === 0 || i === months.length - 1 ? (
            <text
              key={m.key}
              x={
                pad.l +
                (months.length <= 1
                  ? innerW / 2
                  : (i / (months.length - 1)) * innerW)
              }
              y={h - 10}
              textAnchor="middle"
              className="fill-muted"
              fontSize="9"
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
        <li key={h.houseNumber}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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
                <p className="truncate text-xs text-muted">
                  {h.unpaidMonths} de {h.totalMonths} meses
                  {h.name ? ` · ${h.name}` : ""}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-bold text-danger">
              {formatCurrency(h.amount)}
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
