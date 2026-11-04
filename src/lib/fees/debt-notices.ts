import { prisma } from "@/lib/db";
import type {
  DebtNoticeHouse,
  DebtNoticeLine,
} from "@/lib/fees/debt-notice-shared";
import {
  calendarPartsInTijuana,
  currentMonthDueIfUnbilled,
  feeLabel,
  feeOwedAmount,
  formatCurrency,
  fullName,
} from "@/lib/utils";

export type {
  DebtNoticeHouse,
  DebtNoticeLine,
  DebtNoticeRecipient,
} from "@/lib/fees/debt-notice-shared";
export { DEBT_NOTICE_CONSEQUENCES } from "@/lib/fees/debt-notice-shared";

type FeeRow = {
  houseNumber: string;
  year: number;
  month: number;
  amount: number;
  status: string;
  amountPaid: number;
  withSurcharge: boolean;
};

function compareHouse(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "es");
}

function line(year: number, month: number, amount: number): DebtNoticeLine {
  const rounded = Math.round(amount * 100) / 100;
  return {
    label: feeLabel(year, month),
    amount: rounded,
    amountLabel: formatCurrency(rounded),
  };
}

/** Casas con cuota de mantenimiento pendiente hasta el mes en curso. */
export async function listDebtNoticeHouses(): Promise<DebtNoticeHouse[]> {
  const { year, month } = calendarPartsInTijuana();
  const currentKey = year * 12 + month;

  const [fees, users] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: { concept: "MANTENIMIENTO" },
      select: {
        houseNumber: true,
        year: true,
        month: true,
        amount: true,
        status: true,
        amountPaid: true,
        withSurcharge: true,
      },
    }),
    prisma.user.findMany({
      where: {
        houseNumber: { not: null },
        role: { in: ["COLONO", "ADMIN"] },
      },
      select: {
        houseNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        occupancyType: true,
      },
    }),
  ]);

  const feesByHouse = new Map<string, FeeRow[]>();
  for (const fee of fees) {
    const list = feesByHouse.get(fee.houseNumber) ?? [];
    list.push(fee);
    feesByHouse.set(fee.houseNumber, list);
  }

  const usersByHouse = new Map<string, typeof users>();
  for (const user of users) {
    if (!user.houseNumber) continue;
    const list = usersByHouse.get(user.houseNumber) ?? [];
    list.push(user);
    usersByHouse.set(user.houseNumber, list);
  }

  const houseNumbers = new Set<string>([
    ...feesByHouse.keys(),
    ...usersByHouse.keys(),
  ]);

  const notices: DebtNoticeHouse[] = [];
  for (const houseNumber of houseNumbers) {
    const houseFees = feesByHouse.get(houseNumber) ?? [];
    const rows: { year: number; month: number; amount: number }[] = [];
    for (const fee of houseFees) {
      if (fee.year * 12 + fee.month > currentKey) continue;
      const owed = feeOwedAmount(fee);
      if (owed <= 0) continue;
      rows.push({ year: fee.year, month: fee.month, amount: owed });
    }
    const open = currentMonthDueIfUnbilled(houseFees);
    if (open) {
      rows.push({ year: open.year, month: open.month, amount: open.amount });
    }
    if (!rows.length) continue;
    rows.sort((a, b) => a.year - b.year || a.month - b.month);
    const lines = rows.map((row) => line(row.year, row.month, row.amount));
    const total = Math.round(lines.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;

    const houseUsers = usersByHouse.get(houseNumber) ?? [];
    const owners = houseUsers.filter((user) => user.occupancyType === "PROPIETARIO");
    const audience = owners.length ? owners : houseUsers;
    const recipients = audience
      .map((user) => ({
        name: fullName(user),
        email: user.email.trim(),
      }))
      .filter((user) => user.email.includes("@"));

    notices.push({
      houseNumber,
      lines,
      months: lines.length,
      total,
      totalLabel: formatCurrency(total),
      recipients,
    });
  }

  notices.sort(
    (a, b) => b.total - a.total || compareHouse(a.houseNumber, b.houseNumber),
  );
  return notices;
}
