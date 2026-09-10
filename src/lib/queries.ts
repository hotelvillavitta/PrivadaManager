import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  calendarPartsInTijuana,
  overdueMaintenanceWhere,
} from "@/lib/utils";
import {
  DEFAULT_PRIVADA,
  darkColorFromPrimary,
  normalizePrimaryColor,
  parseRulesJson,
  parseSchedulesJson,
  softColorFromPrimary,
  type Privada,
} from "@/lib/privada";

export const getPrivada = cache(async (): Promise<Privada> => {
  const row = await prisma.privadaSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_PRIVADA;

  return {
    id: row.id,
    name: row.name || DEFAULT_PRIVADA.name,
    address: row.address || DEFAULT_PRIVADA.address,
    phone: row.phone || DEFAULT_PRIVADA.phone,
    email: row.email || DEFAULT_PRIVADA.email,
    tagline: row.tagline || DEFAULT_PRIVADA.tagline,
    capacityMax: row.capacityMax || DEFAULT_PRIVADA.capacityMax,
    capacityNote: row.capacityNote,
    schedules: parseSchedulesJson(row.schedulesJson),
    rules: parseRulesJson(row.rulesJson),
    logoUrl: row.logoUrl,
    primaryColor: normalizePrimaryColor(row.primaryColor),
    slug: row.slug || DEFAULT_PRIVADA.slug,
  };
});

/** Variables CSS derivadas del color principal de la privada. */
export function privadaThemeStyle(privada: Privada): Record<string, string> {
  const primary = normalizePrimaryColor(privada.primaryColor);
  return {
    "--primary": primary,
    "--primary-soft": softColorFromPrimary(primary),
    "--primary-dark": darkColorFromPrimary(primary),
    "--ring": primary,
    "--unread": primary,
  };
}

export async function getNewsFeed(userId?: string) {
  const posts = await prisma.newsPost.findMany({
    orderBy: { publishedAt: "desc" },
    take: 40,
    include: {
      reactions: true,
    },
  });

  return posts.map((post) => {
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const r of post.reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (userId && r.userId === userId) mine.add(r.emoji);
    }
    return { ...post, reactionCounts: counts, myReactions: [...mine] };
  });
}

export async function getProviders() {
  return prisma.provider.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getReservations() {
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  from.setDate(1);
  const to = new Date();
  to.setMonth(to.getMonth() + 14);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return prisma.reservation.findMany({
    where: { date: { gte: toKey(from), lte: toKey(to) } },
    orderBy: { date: "asc" },
    include: {
      user: { select: { firstName: true, lastName: true, houseNumber: true } },
    },
  });
}

export async function getFeesForHouse(houseNumber: string) {
  return prisma.monthlyFee.findMany({
    where: { houseNumber, concept: "MANTENIMIENTO" },
    orderBy: [{ year: "desc" }, { month: "asc" }],
  });
}

export async function getPalapaPaymentsForHouse(houseNumber: string) {
  return prisma.palapaPayment.findMany({
    where: { houseNumber },
    orderBy: { paidAt: "desc" },
  });
}

export async function getFinesForHouse(houseNumber: string) {
  return prisma.fine.findMany({
    where: { houseNumber },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getPendingFines(take = 30) {
  return prisma.fine.findMany({
    where: { status: "PENDIENTE" },
    orderBy: { issuedAt: "desc" },
    take,
  });
}

type FeeLike = {
  status: string;
  year: number;
  month: number;
  amount: number;
};

type FineLike = {
  amount: number;
  billingYear: number;
  billingMonth: number;
};

/** Resume cuotas/multas ya cargadas (evita segunda query). */
export function summarizeFees(fees: FeeLike[], pendingFines: FineLike[]) {
  const { year: cy, month: cm } = calendarPartsInTijuana();
  const currentKey = cy * 12 + cm;

  const paid = fees.filter((f) => f.status === "PAGADO").length;
  const debt = fees.filter(
    (f) =>
      f.status === "ADEUDO" ||
      (f.status === "PENDIENTE" && f.year * 12 + f.month <= currentKey),
  ).length;

  const dueFeesAmount = fees
    .filter(
      (f) => f.status !== "PAGADO" && f.year * 12 + f.month <= currentKey,
    )
    .reduce((sum, f) => sum + f.amount, 0);

  const futureFinesAmount = pendingFines
    .filter((f) => f.billingYear * 12 + f.billingMonth > currentKey)
    .reduce((sum, f) => sum + f.amount, 0);
  const pendingFinesAmount = pendingFines.reduce(
    (sum, f) => sum + f.amount,
    0,
  );

  return {
    paid,
    debt,
    pendingAmount: dueFeesAmount + futureFinesAmount,
    dueFeesAmount,
    pendingFinesAmount,
    total: fees.length,
  };
}

export async function getFeeSummary(houseNumber: string) {
  const [fees, pendingFines] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: { houseNumber, concept: "MANTENIMIENTO" },
      select: { status: true, year: true, month: true, amount: true },
    }),
    prisma.fine.findMany({
      where: { houseNumber, status: "PENDIENTE" },
      select: { amount: true, billingYear: true, billingMonth: true },
    }),
  ]);

  return summarizeFees(fees, pendingFines);
}

/** True si la casa adeuda mantenimiento del mes actual o de meses anteriores. */
export async function houseHasPendingFees(
  houseNumber: string | null | undefined,
) {
  if (!houseNumber) return true;
  const pending = await prisma.monthlyFee.count({
    where: overdueMaintenanceWhere(houseNumber),
  });
  return pending > 0;
}

export async function getFinanceEntries(take = 200) {
  return prisma.financeEntry.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      monthlyFee: {
        select: { id: true, houseNumber: true, year: true, month: true },
      },
      palapaPayment: { select: { id: true, houseNumber: true } },
      fine: { select: { id: true, houseNumber: true } },
    },
  });
}

export async function getFinanceSummary() {
  const { year: cy, month: cm } = calendarPartsInTijuana();
  const monthStart = new Date(cy, cm - 1, 1);
  const monthEnd = new Date(cy, cm, 1);

  const [
    cuotaAgg,
    cuotaMesAgg,
    palapaAgg,
    palapaMesAgg,
    manualLedger,
  ] = await Promise.all([
    prisma.monthlyFee.aggregate({
      where: { status: "PAGADO", concept: "MANTENIMIENTO" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.monthlyFee.aggregate({
      where: {
        status: "PAGADO",
        concept: "MANTENIMIENTO",
        year: cy,
        month: cm,
      },
      _sum: { amount: true },
    }),
    prisma.palapaPayment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.palapaPayment.aggregate({
      where: { paidAt: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.financeEntry.findMany({
      where: {
        AND: [
          { monthlyFee: { is: null } },
          { palapaPayment: { is: null } },
          { fine: { is: null } },
        ],
      },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  const cuotaIngresos = cuotaAgg._sum.amount ?? 0;
  const palapaIngresos = palapaAgg._sum.amount ?? 0;
  const ingresosMesCuotas = cuotaMesAgg._sum.amount ?? 0;
  const ingresosMesPalapa = palapaMesAgg._sum.amount ?? 0;

  let ingresosManual = 0;
  let ingresosMesManual = 0;
  let gastosTotales = 0;
  let gastosMes = 0;
  let gastosRegistrados = 0;

  for (const e of manualLedger) {
    const inMonth = e.date >= monthStart && e.date < monthEnd;
    if (e.type === "INGRESO") {
      ingresosManual += e.amount;
      if (inMonth) ingresosMesManual += e.amount;
    } else {
      gastosTotales += e.amount;
      gastosRegistrados += 1;
      if (inMonth) gastosMes += e.amount;
    }
  }

  const ingresosTotales = cuotaIngresos + palapaIngresos + ingresosManual;
  const ingresosMes = ingresosMesCuotas + ingresosMesPalapa + ingresosMesManual;

  return {
    liquidez: ingresosTotales - gastosTotales,
    ingresosMes,
    ingresosTotales,
    gastosMes,
    gastosTotales,
    pagosRegistrados: cuotaAgg._count._all + palapaAgg._count._all,
    gastosRegistrados,
    balanceNetoMes: ingresosMes - gastosMes,
  };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function getNotifications(userId: string, take = 80) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getRecentNotifications(userId: string, take = 5) {
  return getNotifications(userId, take);
}

/** Contadores ligeros para el hub /admin. */
export async function getAdminHubCounts() {
  const [residentCount, pendingReservations, pendingFines, openIssues] =
    await Promise.all([
      prisma.user.count({ where: { role: "COLONO" } }),
      prisma.reservation.count({ where: { status: "PENDING" } }),
      prisma.fine.count({ where: { status: "PENDIENTE" } }),
      prisma.issueReport.count({
        where: { status: { in: ["ABIERTO", "EN_REVISION"] } },
      }),
    ]);

  return {
    residentCount,
    pendingReservations,
    pendingFines,
    openIssues,
  };
}

export async function getResidentsAdmin() {
  return prisma.user.findMany({
    where: { role: { in: ["COLONO", "ADMIN"] } },
    orderBy: [{ role: "asc" }, { houseNumber: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      houseNumber: true,
      accessCode: true,
      gateCode: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function getPendingReservationsAdmin() {
  return prisma.reservation.findMany({
    where: { status: "PENDING" },
    orderBy: { date: "asc" },
    include: {
      user: {
        select: { firstName: true, lastName: true, houseNumber: true },
      },
    },
  });
}

/** Dashboard completo (solo cuando se necesitan varias secciones juntas). */
export async function getAdminDashboard() {
  const { year: cy, month: cm } = calendarPartsInTijuana();
  const [
    residents,
    pendingReservations,
    newsCount,
    providers,
    debtFees,
    paidThisMonth,
    pendingFines,
    openIssues,
  ] = await Promise.all([
    getResidentsAdmin(),
    getPendingReservationsAdmin(),
    prisma.newsPost.count(),
    prisma.provider.count(),
    prisma.monthlyFee.findMany({
      where: {
        status: { in: ["ADEUDO", "PENDIENTE"] },
        OR: [{ year: { lt: cy } }, { year: cy, month: { lte: cm } }],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 20,
    }),
    prisma.monthlyFee.count({
      where: {
        status: "PAGADO",
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    getPendingFines(30),
    prisma.issueReport.count({
      where: { status: { in: ["ABIERTO", "EN_REVISION"] } },
    }),
  ]);

  return {
    residents,
    pendingReservations,
    newsCount,
    providers,
    debtFees,
    paidThisMonth,
    pendingFines,
    openIssues,
    residentCount: residents.filter((r) => r.role === "COLONO").length,
  };
}

export async function getIssueReportsForUser(userId: string) {
  return prisma.issueReport.findMany({
    where: { reporterId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAllIssueReports() {
  return prisma.issueReport.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          houseNumber: true,
          email: true,
        },
      },
    },
  });
}

export async function getHouseNumbers() {
  const users = await prisma.user.findMany({
    where: { houseNumber: { not: null } },
    select: { houseNumber: true },
    distinct: ["houseNumber"],
    orderBy: { houseNumber: "asc" },
  });
  return users
    .map((u) => u.houseNumber)
    .filter((h): h is string => Boolean(h));
}

/** Casas con nombres de residentes, para confirmar cobros sin errores. */
export async function getHousesWithResidents() {
  const users = await prisma.user.findMany({
    where: { houseNumber: { not: null }, role: "COLONO" },
    select: {
      houseNumber: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ houseNumber: "asc" }, { lastName: "asc" }],
  });

  const map = new Map<string, string[]>();
  for (const u of users) {
    if (!u.houseNumber) continue;
    const list = map.get(u.houseNumber) ?? [];
    list.push(`${u.firstName} ${u.lastName}`.trim());
    map.set(u.houseNumber, list);
  }

  return [...map.entries()]
    .map(([houseNumber, residents]) => ({ houseNumber, residents }))
    .sort((a, b) => {
      const na = Number(a.houseNumber);
      const nb = Number(b.houseNumber);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.houseNumber.localeCompare(b.houseNumber, "es");
    });
}
