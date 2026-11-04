"use server";

import { prisma } from "@/lib/db";
import { listDebtNoticeHouses } from "@/lib/fees/debt-notices";
import { isEmailConfigured } from "@/lib/notify/email";
import { sendDebtNoticeEmail } from "@/lib/notify/debt-notice";
import { getPrivada } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export type DebtNoticeSendResult = {
  sentHouses: number;
  sentEmails: number;
  failed: { houseNumber: string; error: string }[];
  skipped: { houseNumber: string; reason: string }[];
};

function issuedOnLabel(date = new Date()) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Tijuana",
  }).format(date);
}

export async function sendDebtNotices(
  houseNumbers: string[],
): Promise<{ error: string } | ({ ok: true } & DebtNoticeSendResult)> {
  await requireAdmin();
  if (!isEmailConfigured()) {
    return { error: "El correo no está configurado en el servidor." };
  }

  const wanted = [
    ...new Set(houseNumbers.map((house) => house.trim()).filter(Boolean)),
  ].slice(0, 120);
  if (!wanted.length) return { error: "Elige al menos una casa." };

  const [houses, privada] = await Promise.all([
    listDebtNoticeHouses(),
    getPrivada(),
  ]);
  const byHouse = new Map(houses.map((house) => [house.houseNumber, house]));
  const dateLabel = issuedOnLabel();
  const failed: DebtNoticeSendResult["failed"] = [];
  const skipped: DebtNoticeSendResult["skipped"] = [];
  let sentHouses = 0;
  let sentEmails = 0;

  for (const houseNumber of wanted) {
    const house = byHouse.get(houseNumber);
    if (!house) {
      skipped.push({
        houseNumber,
        reason: "Ya no tiene adeudo de mantenimiento.",
      });
      continue;
    }
    if (!house.recipients.length) {
      skipped.push({
        houseNumber,
        reason: "No hay correo de propietario.",
      });
      continue;
    }

    const delivered: { email: string }[] = [];
    let houseError = "";
    for (const recipient of house.recipients) {
      const result = await sendDebtNoticeEmail({
        residentEmail: recipient.email,
        houseNumber: house.houseNumber,
        months: house.months,
        lines: house.lines.map((line) => ({
          label: line.label,
          amount: line.amount,
        })),
        total: house.total,
        issuedOnLabel: dateLabel,
        privadaName: privada.name,
        privadaAddress: privada.address,
        privadaEmail: privada.email,
        privadaPhone: privada.phone,
      });
      if (result.ok) {
        delivered.push(recipient);
      } else if (!houseError) {
        houseError = result.error ?? "No se pudo enviar el correo.";
      }
    }

    if (delivered.length) {
      const users = await prisma.user.findMany({
        where: {
          email: { in: delivered.map((item) => item.email) },
          houseNumber,
        },
        select: { id: true },
      });
      if (users.length) {
        await prisma.notification.createMany({
          data: users.map((user) => ({
            userId: user.id,
            title: "Aviso de adeudo",
            body: `Casa ${houseNumber}: ${house.months} ${house.months === 1 ? "mes" : "meses"} de mantenimiento pendiente, ${formatCurrency(house.total)}. El detalle se envió por correo.`,
          })),
        });
      }
      sentHouses += 1;
      sentEmails += delivered.length;
    }
    if (houseError && delivered.length < house.recipients.length) {
      failed.push({ houseNumber, error: houseError });
    }
  }

  return { ok: true, sentHouses, sentEmails, failed, skipped };
}
