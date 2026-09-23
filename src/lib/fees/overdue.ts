import { prisma } from "@/lib/db";
import {
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  FEE_LATE_SURCHARGE,
  isFeePaymentLate,
  unpaidMaintenanceDueAmount,
} from "@/lib/utils";

/**
 * Asegura que cuotas vencidas (pasado el día 10) incluyan el recargo de $50
 * en el amount persistido. Idempotente.
 */
export async function syncOverdueMaintenanceSurcharges(asOf: Date = new Date()) {
  const unpaid = await prisma.monthlyFee.findMany({
    where: {
      concept: FEE_CONCEPT.MANTENIMIENTO,
      status: { in: ["ADEUDO", "PENDIENTE"] },
    },
    select: {
      id: true,
      year: true,
      month: true,
      amount: true,
      status: true,
      withSurcharge: true,
    },
  });

  const toWrite: { id: string; amount: number; withSurcharge: boolean }[] = [];

  for (const fee of unpaid) {
    if (!isFeePaymentLate(fee.year, fee.month, asOf)) continue;
    const due = unpaidMaintenanceDueAmount(fee, asOf);
    const nextAmount = due > fee.amount + 0.01 ? due : fee.amount;
    const withSurcharge =
      nextAmount >= FEE_BASE_AMOUNT + FEE_LATE_SURCHARGE - 0.01;
    if (
      Math.abs(nextAmount - fee.amount) < 0.01 &&
      fee.withSurcharge === withSurcharge
    ) {
      continue;
    }
    toWrite.push({ id: fee.id, amount: nextAmount, withSurcharge });
  }

  if (toWrite.length === 0) return { updated: 0 };

  const chunk = 50;
  for (let i = 0; i < toWrite.length; i += chunk) {
    const slice = toWrite.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((u) =>
        prisma.monthlyFee.update({
          where: { id: u.id },
          data: { amount: u.amount, withSurcharge: u.withSurcharge },
        }),
      ),
    );
  }

  return { updated: toWrite.length };
}
