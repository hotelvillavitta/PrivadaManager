import { prisma } from "@/lib/db";
import {
  calendarPartsInTijuana,
  overdueMaintenanceWhere,
} from "@/lib/utils";

export async function getPrivada() {
  return (
    (await prisma.privadaSettings.findUnique({ where: { id: 1 } })) ?? {
      name: "Grenaché",
      address: "Priv. Grenache 4176, Fracc. Viñas del Mar",
      phone: "+52 (664) 356-4100",
      email: "comitegrenche@gmail.com",
      tagline:
        "Comunidad residencial comprometida con la excelencia y el bienestar de todos sus residentes.",
    }
  );
}

export async function getNewsFeed(userId?: string) {
  const posts = await prisma.newsPost.findMany({
    orderBy: { publishedAt: "desc" },
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
  return prisma.provider.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function getReservations() {
  return prisma.reservation.findMany({
    orderBy: { date: "asc" },
    include: {
      user: { select: { firstName: true, lastName: true, houseNumber: true } },
    },
  });
}

export async function getFeesForHouse(houseNumber: string) {
  return prisma.monthlyFee.findMany({
    // Solo mantenimiento y sus recargos forman parte del historial de cuotas.
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

export async function getFeeSummary(houseNumber: string) {
  const { year: cy, month: cm } = calendarPartsInTijuana();
  const currentKey = cy * 12 + cm;

  const [fees, pendingFines] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: { houseNumber, concept: "MANTENIMIENTO" },
    }),
    prisma.fine.findMany({
      where: { houseNumber, status: "PENDIENTE" },
      select: { amount: true, billingYear: true, billingMonth: true },
    }),
  ]);

  const paid = fees.filter((f) => f.status === "PAGADO").length;
  const debt = fees.filter(
    (f) =>
      f.status === "ADEUDO" ||
      (f.status === "PENDIENTE" && f.year * 12 + f.month <= currentKey),
  ).length;

  // Cuotas ya exigibles (mes actual o anterior) no pagadas.
  const dueFeesAmount = fees
    .filter(
      (f) => f.status !== "PAGADO" && f.year * 12 + f.month <= currentKey,
    )
    .reduce((sum, f) => sum + f.amount, 0);

  // Multas pendientes: las de meses futuros aún no están en una cuota exigible.
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

/** True si la casa adeuda mantenimiento del mes actual o de meses anteriores. */
export async function houseHasPendingFees(houseNumber: string | null | undefined) {
  if (!houseNumber) return true;
  const pending = await prisma.monthlyFee.count({
    where: overdueMaintenanceWhere(houseNumber),
  });
  return pending > 0;
}



export async function getFinanceSummary() {
  const entries = await prisma.financeEntry.findMany();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let ingresosTotales = 0;
  let gastosTotales = 0;
  let ingresosMes = 0;
  let gastosMes = 0;
  let pagosRegistrados = 0;
  let gastosRegistrados = 0;

  for (const e of entries) {
    const inMonth = e.date >= monthStart;
    if (e.type === "INGRESO") {
      ingresosTotales += e.amount;
      pagosRegistrados += 1;
      if (inMonth) ingresosMes += e.amount;
    } else {
      gastosTotales += e.amount;
      gastosRegistrados += 1;
      if (inMonth) gastosMes += e.amount;
    }
  }

  const feePayments = await prisma.monthlyFee.count({
    where: { status: "PAGADO" },
  });

  return {
    liquidez: ingresosTotales - gastosTotales,
    ingresosMes,
    ingresosTotales,
    gastosMes,
    gastosTotales,
    pagosRegistrados: Math.max(pagosRegistrados, feePayments),
    gastosRegistrados,
    balanceNetoMes: ingresosMes - gastosMes,
    entries: entries.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 12),
  };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function getNotifications(userId: string, take = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getRecentNotifications(userId: string, take = 5) {
  return getNotifications(userId, take);
}

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
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["COLONO", "ADMIN"] } },
      orderBy: [{ role: "asc" }, { houseNumber: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        houseNumber: true,
        accessCode: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.reservation.findMany({
      where: { status: "PENDING" },
      orderBy: { date: "asc" },
      include: {
        user: {
          select: { firstName: true, lastName: true, houseNumber: true },
        },
      },
    }),
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
    prisma.fine.findMany({
      where: { status: "PENDIENTE" },
      orderBy: { issuedAt: "desc" },
      take: 30,
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
    residentCount: residents.filter((r) => r.role === "COLONO").length,
  };
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
