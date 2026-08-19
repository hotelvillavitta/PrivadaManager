import { prisma } from "@/lib/db";
import { MONTH_LABELS } from "@/lib/utils";

function periodKey(year: number, month: number) {
  return year * 12 + month;
}

function periodLabel(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]}'${String(year).slice(-2)}`;
}

function isUnpaid(status: string) {
  return status === "ADEUDO" || status === "PENDIENTE";
}

export type CollectionKpis = {
  rangeLabel: string;
  collectionRate: number;
  collectionRateDelta: number | null;
  paidCount: number;
  totalCount: number;
  totalDebt: number;
  pendingFees: number;
  housesWithDebt: number;
  totalHouses: number;
  housesWithDebtPct: number;
  avgDebt: number;
  byMonth: {
    key: number;
    label: string;
    paid: number;
    unpaid: number;
    rate: number;
  }[];
  aging: {
    current: number;
    late1to2: number;
    late3to4: number;
    late5plus: number;
  };
  topDebt: {
    rank: number;
    houseNumber: string;
    name: string;
    amount: number;
    unpaidMonths: number;
    totalMonths: number;
  }[];
};

export async function getCollectionKpis(): Promise<CollectionKpis> {
  const [fees, residents] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: { concept: "MANTENIMIENTO" },
      select: {
        houseNumber: true,
        year: true,
        month: true,
        amount: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "COLONO", houseNumber: { not: null } },
      select: { houseNumber: true, firstName: true, lastName: true },
    }),
  ]);

  const names = new Map<string, string>();
  for (const r of residents) {
    if (!r.houseNumber || names.has(r.houseNumber)) continue;
    names.set(r.houseNumber, `${r.firstName} ${r.lastName}`.trim());
  }

  const paidCount = fees.filter((f) => f.status === "PAGADO").length;
  const totalCount = fees.length;
  const collectionRate = totalCount === 0 ? 0 : (paidCount / totalCount) * 100;

  const unpaidFees = fees.filter((f) => isUnpaid(f.status));
  const totalDebt = unpaidFees.reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = unpaidFees.length;

  const monthMap = new Map<
    number,
    { year: number; month: number; paid: number; unpaid: number }
  >();
  const byHouse = new Map<
    string,
    { unpaidMonths: number; totalMonths: number; amount: number }
  >();

  for (const f of fees) {
    const key = periodKey(f.year, f.month);
    const month = monthMap.get(key) ?? {
      year: f.year,
      month: f.month,
      paid: 0,
      unpaid: 0,
    };
    if (f.status === "PAGADO") month.paid += 1;
    else month.unpaid += 1;
    monthMap.set(key, month);

    const house = byHouse.get(f.houseNumber) ?? {
      unpaidMonths: 0,
      totalMonths: 0,
      amount: 0,
    };
    house.totalMonths += 1;
    if (isUnpaid(f.status)) {
      house.unpaidMonths += 1;
      house.amount += f.amount;
    }
    byHouse.set(f.houseNumber, house);
  }

  const byMonth = [...monthMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, m]) => {
      const billed = m.paid + m.unpaid;
      return {
        key,
        label: periodLabel(m.year, m.month),
        paid: m.paid,
        unpaid: m.unpaid,
        rate: billed === 0 ? 0 : (m.paid / billed) * 100,
      };
    });

  const last = byMonth.at(-1);
  const prev = byMonth.at(-2);
  const collectionRateDelta =
    last && prev ? last.rate - prev.rate : null;

  const housesWithDebt = [...byHouse.values()].filter((h) => h.amount > 0).length;
  const totalHouses = byHouse.size;
  const avgDebt = housesWithDebt === 0 ? 0 : totalDebt / housesWithDebt;

  const aging = { current: 0, late1to2: 0, late3to4: 0, late5plus: 0 };
  for (const h of byHouse.values()) {
    if (h.unpaidMonths === 0) aging.current += 1;
    else if (h.unpaidMonths <= 2) aging.late1to2 += 1;
    else if (h.unpaidMonths <= 4) aging.late3to4 += 1;
    else aging.late5plus += 1;
  }

  const topDebt = [...byHouse.entries()]
    .filter(([, h]) => h.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10)
    .map(([houseNumber, h], i) => ({
      rank: i + 1,
      houseNumber,
      name: names.get(houseNumber) ?? `Casa ${houseNumber}`,
      amount: h.amount,
      unpaidMonths: h.unpaidMonths,
      totalMonths: h.totalMonths,
    }));

  const rangeLabel =
    byMonth.length === 0
      ? "Sin datos"
      : `${byMonth[0].label} – ${byMonth.at(-1)!.label}`;

  return {
    rangeLabel,
    collectionRate,
    collectionRateDelta,
    paidCount,
    totalCount,
    totalDebt,
    pendingFees,
    housesWithDebt,
    totalHouses,
    housesWithDebtPct:
      totalHouses === 0 ? 0 : (housesWithDebt / totalHouses) * 100,
    avgDebt,
    byMonth,
    aging,
    topDebt,
  };
}
