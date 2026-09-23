"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { NewsCategory, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { saveUploadedDocument, fileFromFormData } from "@/lib/uploads";
import { ISSUE_CATEGORIES } from "@/lib/issues/catalog";
import { overdueMaintenanceWhere } from "@/lib/utils";
import {
  FEE_ANNUAL_MONTHS,
  FEE_BASE_AMOUNT,
  FEE_CONCEPT,
  FEE_CONCEPT_LABEL,
  FEE_LATE_SURCHARGE,
  FEE_PALAPA_AMOUNT,
  feeLabel,
  formatCurrency,
  fullName,
  isFeePaymentLate,
  calendarPartsInTijuana,
  feePeriodRange,
  nextFeePeriod,
  pickFineBillingPeriod,
} from "@/lib/utils";
import { getPrivada } from "@/lib/queries";
import { issueTemporaryPassword } from "@/lib/issue-password";
import {
  sendPaymentReceiptEmail,
  type PaymentReceiptLine,
} from "@/lib/notify/payment-receipt";
import { sendFineNoticeEmail } from "@/lib/notify/fine-notice";
import { getFineCauseById } from "@/lib/fines/catalog";
import {
  MASTER_ADMIN_EMAIL,
  isMasterAdminEmail,
} from "@/lib/master-admin";

export async function toggleNewsReaction(newsId: string, emoji: string) {
  const user = await requireUser();

  const existing = await prisma.newsReaction.findUnique({
    where: {
      newsId_userId_emoji: { newsId, userId: user.id, emoji },
    },
  });

  if (existing) {
    await prisma.newsReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.newsReaction.create({
      data: { newsId, userId: user.id, emoji },
    });
  }

  revalidatePath("/noticias");
  return { ok: true };
}

/** Solo para invocación desde el cliente (form/onClick). No usar en render de RSC. */
export async function markNewsAsRead(newsId: string) {
  const user = await requireUser();
  await prisma.newsRead.upsert({
    where: { newsId_userId: { newsId, userId: user.id } },
    create: { newsId, userId: user.id },
    update: { readAt: new Date() },
  });
  await prisma.notification.updateMany({
    where: { userId: user.id, newsId, read: false },
    data: { read: true },
  });
  revalidatePath("/notificaciones");
  revalidatePath("/");
  revalidatePath("/noticias");
}

export async function createNewsPost(formData: FormData) {
  const user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "AVISO") as NewsCategory;
  const file = formData.get("document");
  const clientUrl = String(formData.get("documentUrl") ?? "").trim();
  const clientName = String(formData.get("documentName") ?? "").trim() || null;

  if (!title || !body) {
    return { error: "Título y contenido son obligatorios." };
  }

  let documentUrl: string | null = null;
  let documentName: string | null = null;
  try {
    if (clientUrl.startsWith("https://") || clientUrl.startsWith("/")) {
      documentUrl = clientUrl;
      documentName = clientName;
    } else {
      const saved = await saveUploadedDocument(fileFromFormData(file));
      documentUrl = saved.documentUrl;
      documentName = saved.documentName;
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo subir el documento.",
    };
  }

  const post = await prisma.newsPost.create({
    data: {
      title,
      body,
      category,
      hasDocument: Boolean(documentUrl),
      documentUrl,
      documentName,
      authorId: user.id,
    },
  });

  const residents = await prisma.user.findMany({
    where: { role: "COLONO" },
    select: { id: true },
  });

  if (residents.length) {
    await prisma.notification.createMany({
      data: residents.map((r) => ({
        userId: r.id,
        title: "Nuevo comunicado",
        body: title,
        newsId: post.id,
      })),
    });
  }

  revalidatePath("/noticias");
  revalidatePath("/notificaciones");
  return { ok: true };
}

export async function createReservation(formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const guests = Number(formData.get("guests") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date || !eventName || !guests) {
    return { error: "Completa fecha, motivo e invitados." };
  }
  const privada = await getPrivada();
  const capacityMax = privada.capacityMax || 50;
  if (guests < 1 || guests > capacityMax) {
    return {
      error: `La capacidad máxima es de ${capacityMax} personas.`,
    };
  }

  if (!user.houseNumber) {
    return { error: "Tu cuenta no tiene casa asignada. Contacta al comité." };
  }

  const pendingFees = await prisma.monthlyFee.count({
    where: overdueMaintenanceWhere(user.houseNumber),
  });
  if (pendingFees > 0) {
    return {
      error:
        "Tienes cuotas pendientes del mes en curso o anteriores. Regularízalas para poder reservar (meses futuros no bloquean).",
    };
  }

  const conflict = await prisma.reservation.findFirst({
    where: {
      date,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (conflict) {
    return { error: "Esa fecha ya tiene una reservación o solicitud." };
  }

  // Mínimo 7 días de anticipación
  const requested = new Date(`${date}T12:00:00`);
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + 7);
  if (Number.isNaN(requested.getTime()) || requested < minDate) {
    return {
      error: "Las reservaciones deben solicitarse con al menos 1 semana de anticipación.",
    };
  }

  const reservation = await prisma.reservation.create({
    data: {
      date,
      eventName,
      guests,
      notes,
      userId: user.id,
      status: "PENDING",
    },
  });

  const house = user.houseNumber;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Nueva solicitud de palapa",
        body: `Casa ${house} · ${eventName} · ${date} · ${guests} personas`,
        reservationId: reservation.id,
      })),
    });
  }

  revalidatePath("/reservaciones");
  revalidatePath("/notificaciones");
  revalidatePath("/admin");
  revalidatePath("/admin/reservaciones");
  return { ok: true, reservationId: reservation.id };
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  rejectionReason?: string | null,
) {
  await requireAdmin();

  const reason = String(rejectionReason ?? "").trim();
  if (status === "REJECTED" && !reason) {
    return { error: "Indica el motivo del rechazo." };
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? reason : null,
    },
    include: { user: true },
  });

  // Marca leídas las notificaciones del comité ligadas a esta solicitud
  await prisma.notification.updateMany({
    where: { reservationId: id, read: false },
    data: { read: true },
  });

  await prisma.notification.create({
    data: {
      userId: reservation.userId,
      title:
        status === "APPROVED"
          ? "Reservación aprobada"
          : status === "REJECTED"
            ? "Reservación rechazada"
            : "Reservación actualizada",
      body:
        status === "REJECTED"
          ? `${reservation.eventName} (${reservation.date}). Motivo: ${reason}`
          : `${reservation.eventName} (${reservation.date})`,
      reservationId: reservation.id,
    },
  });

  revalidatePath("/reservaciones");
  revalidatePath("/admin");
  revalidatePath("/admin/reservaciones");
  revalidatePath("/notificaciones");
  revalidatePath("/");
  return { ok: true };
}

export async function createProvider(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "Otro").trim();

  if (!name || !role || !phone) {
    return { error: "Nombre, rol y teléfono son obligatorios." };
  }

  await prisma.provider.create({
    data: { name, role, phone, email, category },
  });

  revalidatePath("/directorio");
  return { ok: true };
}

export async function updateProvider(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "Otro").trim();

  if (!id || !name || !role || !phone) {
    return { error: "Datos incompletos." };
  }

  await prisma.provider.update({
    where: { id },
    data: { name, role, phone, email, category },
  });
  revalidatePath("/directorio");
  return { ok: true };
}

export async function deleteProvider(id: string) {
  await requireAdmin();
  if (!id) return { error: "Contacto inválido." };
  await prisma.provider.delete({ where: { id } });
  revalidatePath("/directorio");
  return { ok: true };
}

export async function updateNewsPost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "AVISO") as NewsCategory;
  const file = formData.get("document");
  const removeDocument = formData.get("removeDocument") === "on";
  const clientUrl = String(formData.get("documentUrl") ?? "").trim();
  const clientName = String(formData.get("documentName") ?? "").trim() || null;

  if (!id || !title || !body) {
    return { error: "Título y contenido son obligatorios." };
  }

  const existing = await prisma.newsPost.findUnique({ where: { id } });
  if (!existing) return { error: "Comunicado no encontrado." };

  let documentUrl = existing.documentUrl;
  let documentName = existing.documentName;
  let hasDocument = existing.hasDocument;

  if (removeDocument) {
    documentUrl = null;
    documentName = null;
    hasDocument = false;
  }

  try {
    if (clientUrl.startsWith("https://") || clientUrl.startsWith("/")) {
      documentUrl = clientUrl;
      documentName = clientName;
      hasDocument = true;
    } else {
      const saved = await saveUploadedDocument(fileFromFormData(file));
      if (saved.documentUrl) {
        documentUrl = saved.documentUrl;
        documentName = saved.documentName;
        hasDocument = true;
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo subir el documento.",
    };
  }

  await prisma.newsPost.update({
    where: { id },
    data: {
      title,
      body,
      category,
      documentUrl,
      documentName,
      hasDocument,
    },
  });

  revalidatePath("/noticias");
  revalidatePath(`/noticias/${id}`);
  revalidatePath("/notificaciones");
  return { ok: true };
}

export async function deleteNewsPost(id: string) {
  await requireAdmin();
  if (!id) return { error: "Comunicado inválido." };
  await prisma.newsPost.delete({ where: { id } });
  revalidatePath("/noticias");
  revalidatePath("/notificaciones");
  revalidatePath("/admin");
  return { ok: true };
}

export async function createResident(formData: FormData) {
  const actor = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim() || null;
  const accessCode = String(formData.get("accessCode") ?? "").trim() || null;
  const gateCode = String(formData.get("gateCode") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "COLONO") as "COLONO" | "ADMIN";

  if (!email || !firstName || !lastName) {
    return { error: "Nombre y correo son obligatorios." };
  }
  if (isMasterAdminEmail(email) && !isMasterAdminEmail(actor.email)) {
    return { error: "No puedes crear esa cuenta." };
  }
  if (role !== "COLONO" && role !== "ADMIN") {
    return { error: "Rol inválido." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ese correo ya está registrado." };

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: "pending",
      firstName,
      lastName,
      houseNumber,
      accessCode,
      gateCode,
      role,
      mustChangePassword: true,
    },
  });

  const issued = await issueTemporaryPassword(user.id);
  if ("error" in issued) return issued;

  revalidatePath("/admin");
  revalidatePath("/admin/residentes");
  revalidatePath("/cuotas");
  return issued;
}

export async function generateResidentPassword(userId: string) {
  const actor = await requireAdmin();
  if (!userId) return { error: "Residente inválido." };
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!target) return { error: "Residente no encontrado." };
  if (
    isMasterAdminEmail(target.email) &&
    !isMasterAdminEmail(actor.email)
  ) {
    return { error: "No puedes modificar esa cuenta." };
  }
  const issued = await issueTemporaryPassword(userId);
  revalidatePath("/admin");
  return issued;
}

export async function updateResident(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim() || null;
  const accessCode = String(formData.get("accessCode") ?? "").trim() || null;
  const gateCode = String(formData.get("gateCode") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "COLONO") as "COLONO" | "ADMIN";

  if (!id || !email || !firstName || !lastName) {
    return { error: "Datos incompletos." };
  }
  if (role !== "COLONO" && role !== "ADMIN") {
    return { error: "Rol inválido." };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!target) return { error: "Residente no encontrado." };
  if (
    isMasterAdminEmail(target.email) &&
    !isMasterAdminEmail(actor.email)
  ) {
    return { error: "No puedes modificar esa cuenta." };
  }
  if (isMasterAdminEmail(email) && !isMasterAdminEmail(actor.email)) {
    return { error: "No puedes usar ese usuario." };
  }
  // El maestro no debe perder su identidad ni quedar sin privilegios.
  if (isMasterAdminEmail(target.email)) {
    if (email !== MASTER_ADMIN_EMAIL) {
      return { error: "No se puede cambiar el usuario del admin maestro." };
    }
    if (role !== "ADMIN") {
      return { error: "El admin maestro debe conservar el rol Admin." };
    }
  }

  const other = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });
  if (other) return { error: "Ese correo ya está en uso." };

  await prisma.user.update({
    where: { id },
    data: {
      email,
      firstName,
      lastName,
      houseNumber,
      accessCode,
      gateCode,
      role,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/residentes");
  revalidatePath("/cuotas");
  return { ok: true };
}

export async function deleteResident(id: string) {
  const admin = await requireAdmin();
  if (!id) return { error: "Residente inválido." };
  if (id === admin.id) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!target) return { error: "Residente no encontrado." };
  if (isMasterAdminEmail(target.email)) {
    return { error: "No se puede eliminar al admin maestro." };
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/residentes");
  revalidatePath("/cuotas");
  return { ok: true };
}

/** Activa o desactiva el convenio de pago de una casa. */
export async function setHouseConvenio(formData: FormData) {
  await requireAdmin();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();
  const hasConvenio = formData.get("hasConvenio") === "on";
  const convenioNotes =
    String(formData.get("convenioNotes") ?? "").trim() || null;

  if (!houseNumber) return { error: "Selecciona una casa." };

  await prisma.houseAccount.upsert({
    where: { houseNumber },
    create: {
      houseNumber,
      hasConvenio,
      convenioNotes,
      convenioUpdatedAt: new Date(),
    },
    update: {
      hasConvenio,
      convenioNotes,
      convenioUpdatedAt: new Date(),
    },
  });

  revalidatePath("/admin/cobranza");
  revalidatePath("/cuotas");
  return { ok: true, hasConvenio };
}

export async function markNotificationsRead(_formData?: FormData) {
  void _formData;
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/");
  revalidatePath("/notificaciones");
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/");
  revalidatePath("/notificaciones");
  return { ok: true };
}

async function upsertPaidConcept(opts: {
  houseNumber: string;
  year: number;
  month: number;
  concept: string;
  amount: number;
  description: string;
  paidAt: Date;
  withSurcharge?: boolean;
  /** Si es parcial, suma a amountPaid sin exigir liquidar todo. */
  partial?: boolean;
}) {
  const {
    houseNumber,
    year,
    month,
    concept,
    amount,
    description,
    paidAt,
    withSurcharge = false,
    partial = false,
  } = opts;

  const existing = await prisma.monthlyFee.findUnique({
    where: {
      houseNumber_year_month_concept: {
        houseNumber,
        year,
        month,
        concept,
      },
    },
  });

  if (existing?.status === "PAGADO") {
    return {
      error: `${FEE_CONCEPT_LABEL[concept] ?? concept} de ${feeLabel(year, month)} ya está pagado.`,
    } as const;
  }

  const prevPaid = existing?.amountPaid ?? 0;
  const targetAmount = existing?.amount ?? amount;
  const nextPaid = partial
    ? Math.min(targetAmount, prevPaid + amount)
    : Math.max(targetAmount, amount);
  const fullyPaid = partial
    ? nextPaid >= targetAmount
    : true;
  const feeAmount = partial ? targetAmount : amount;
  const entryAmount = partial ? amount : feeAmount;

  // Un ingreso PENDING por cobro: no afecta el saldo público hasta Tesorería.
  const entry = await prisma.financeEntry.create({
    data: {
      type: "INGRESO",
      category: "Cuotas",
      description,
      amount: entryAmount,
      date: paidAt,
      status: "PENDING",
    },
  });

  const fee = await prisma.monthlyFee.upsert({
    where: {
      houseNumber_year_month_concept: {
        houseNumber,
        year,
        month,
        concept,
      },
    },
    create: {
      houseNumber,
      year,
      month,
      concept,
      status: fullyPaid ? "PAGADO" : "ADEUDO",
      amount: feeAmount,
      amountPaid: nextPaid,
      withSurcharge,
      paidAt: fullyPaid ? paidAt : null,
      ...(fullyPaid ? { financeEntryId: entry.id } : {}),
    },
    update: {
      status: fullyPaid
        ? "PAGADO"
        : existing?.status === "PENDIENTE"
          ? "ADEUDO"
          : (existing?.status ?? "ADEUDO"),
      amount: feeAmount,
      amountPaid: nextPaid,
      withSurcharge: withSurcharge || existing?.withSurcharge || false,
      paidAt: fullyPaid ? paidAt : (existing?.paidAt ?? null),
      ...(fullyPaid ? { financeEntryId: entry.id } : {}),
    },
  });

  return {
    ok: true as const,
    feeId: fee.id,
    amount: entryAmount,
    entryId: entry.id,
  };
}

/** Cobranza: mantenimiento (+ recargo opcional) y/o usos independientes de palapa.
 *  También soporta abonos FIFO sobre el adeudo total (`mode=abono`).
 */
export async function registerCobranza(formData: FormData) {
  await requireAdmin();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();
  const mode = String(formData.get("mode") ?? "periodo");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const includeMaintenance = formData.get("includeMaintenance") === "on";
  const includeLate = formData.get("includeLate") === "on";
  const includePalapa = formData.get("includePalapa") === "on";
  const maintenanceAmount = Number(
    formData.get("maintenanceAmount") ?? FEE_BASE_AMOUNT,
  );
  const lateAmount = Number(formData.get("lateAmount") ?? FEE_LATE_SURCHARGE);
  const palapaAmount = Number(formData.get("palapaAmount") ?? FEE_PALAPA_AMOUNT);
  const abonoAmount = Number(formData.get("abonoAmount") ?? 0);

  if (!houseNumber) {
    return { error: "Selecciona casa." };
  }

  // —— Abono a cuenta (FIFO) + opcional mes en curso / siguiente ——
  if (mode === "abono") {
    const includeCurrent = formData.get("includeCurrent") === "on";
    const includeNext = formData.get("includeNext") === "on";
    const monthlyAmount = Number(
      formData.get("maintenanceAmount") ?? FEE_BASE_AMOUNT,
    );
    const monthBase =
      Number.isFinite(monthlyAmount) && monthlyAmount > 0
        ? monthlyAmount
        : FEE_BASE_AMOUNT;

    if (Number.isNaN(abonoAmount) || abonoAmount < 0) {
      return { error: "Indica un monto de abono válido." };
    }
    if (abonoAmount <= 0 && !includeCurrent && !includeNext) {
      return {
        error: "Indica un abono o incluye el mes en curso / siguiente.",
      };
    }

    const unpaid = await prisma.monthlyFee.findMany({
      where: {
        houseNumber,
        concept: FEE_CONCEPT.MANTENIMIENTO,
        status: { in: ["ADEUDO", "PENDIENTE"] },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    const owedTotal = unpaid.reduce(
      (s, f) => s + Math.max(0, f.amount - f.amountPaid),
      0,
    );

    if (abonoAmount > 0) {
      if (owedTotal <= 0) {
        return { error: "Esta casa no tiene adeudo de mantenimiento para abonar." };
      }
      if (abonoAmount > owedTotal + 0.01) {
        return {
          error: `El abono no puede superar el adeudo total (${formatCurrency(owedTotal)}).`,
        };
      }
    }

    const paidAt = new Date();
    const receiptLines: PaymentReceiptLine[] = [];
    const applied: string[] = [];
    let totalCharged = 0;

    // 1) FIFO sobre adeudo
    let remaining = abonoAmount;
    for (const fee of unpaid) {
      if (remaining <= 0) break;
      const owed = Math.max(0, fee.amount - fee.amountPaid);
      if (owed <= 0) continue;
      const pay = Math.min(remaining, owed);
      const nextPaid = fee.amountPaid + pay;
      const fullyPaid = nextPaid >= fee.amount - 0.01;
      await prisma.monthlyFee.update({
        where: { id: fee.id },
        data: {
          amountPaid: nextPaid,
          status: fullyPaid ? "PAGADO" : "ADEUDO",
          paidAt: fullyPaid ? paidAt : fee.paidAt,
          withSurcharge: fee.withSurcharge,
        },
      });
      const label = `Abono ${feeLabel(fee.year, fee.month)}${fullyPaid ? " (liquidado)" : " (parcial)"}`;
      receiptLines.push({ label, amount: pay });
      applied.push(`${feeLabel(fee.year, fee.month)} $${pay}`);
      totalCharged += pay;
      remaining -= pay;
    }

    // 2) Completar / crear mes en curso y/o siguiente
    const { year: cy, month: cm } = calendarPartsInTijuana();
    const extraPeriods: { year: number; month: number; tag: string }[] = [];
    if (includeCurrent) extraPeriods.push({ year: cy, month: cm, tag: "Mes en curso" });
    if (includeNext) {
      const n = nextFeePeriod(cy, cm);
      extraPeriods.push({ year: n.year, month: n.month, tag: "Mes siguiente" });
    }

    for (const extra of extraPeriods) {
      const existing = await prisma.monthlyFee.findUnique({
        where: {
          houseNumber_year_month_concept: {
            houseNumber,
            year: extra.year,
            month: extra.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
          },
        },
      });

      if (existing?.status === "PAGADO") {
        continue;
      }

      const feeAmount = existing?.amount ?? monthBase;
      const prevPaid = existing?.amountPaid ?? 0;
      const pay = Math.round((feeAmount - prevPaid) * 100) / 100;
      if (pay <= 0.01) {
        if (existing) {
          await prisma.monthlyFee.update({
            where: { id: existing.id },
            data: {
              status: "PAGADO",
              amountPaid: feeAmount,
              paidAt,
            },
          });
        }
        continue;
      }

      await prisma.monthlyFee.upsert({
        where: {
          houseNumber_year_month_concept: {
            houseNumber,
            year: extra.year,
            month: extra.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
          },
        },
        create: {
          houseNumber,
          year: extra.year,
          month: extra.month,
          concept: FEE_CONCEPT.MANTENIMIENTO,
          amount: feeAmount,
          amountPaid: feeAmount,
          status: "PAGADO",
          withSurcharge: false,
          paidAt,
        },
        update: {
          amount: feeAmount,
          amountPaid: feeAmount,
          status: "PAGADO",
          withSurcharge: false,
          paidAt,
        },
      });

      const label = `${extra.tag} ${feeLabel(extra.year, extra.month)}`;
      receiptLines.push({ label, amount: pay });
      applied.push(`${feeLabel(extra.year, extra.month)} $${pay}`);
      totalCharged += pay;
    }

    if (totalCharged <= 0 || receiptLines.length === 0) {
      return {
        error:
          "No hay nada que registrar: el abono no aplicó o esos meses ya estaban pagados.",
      };
    }

    totalCharged = Math.round(totalCharged * 100) / 100;
    const periodLabel =
      receiptLines.length === 1
        ? receiptLines[0]!.label
        : `Cobro combinado (${receiptLines.length} conceptos)`;

    await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Cuotas",
        description: `Casa ${houseNumber} · ${periodLabel} · ${applied.join(", ")}`,
        amount: totalCharged,
        date: paidAt,
        status: "PENDING",
      },
    });

    const residents = await prisma.user.findMany({
      where: { houseNumber, role: { in: ["COLONO", "ADMIN"] } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (residents.length) {
      await prisma.notification.createMany({
        data: residents.map((r) => ({
          userId: r.id,
          title: "Pago registrado",
          body: `Casa ${houseNumber} · ${formatCurrency(totalCharged)} · ${applied.join(", ")}.`,
        })),
      });
      const privada = await getPrivada();
      after(() => {
        void Promise.all(
          residents.map((r) =>
            sendPaymentReceiptEmail({
              residentName: fullName(r),
              residentEmail: r.email,
              houseNumber,
              periodLabel,
              lines: receiptLines,
              total: totalCharged,
              paidAt,
              privadaName: privada.name,
              privadaAddress: privada.address,
              privadaEmail: privada.email,
              privadaPhone: privada.phone,
            }),
          ),
        ).catch((err) => console.error("[abono] email failed", err));
      });
    }

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/cobranza/matriz");
    revalidatePath("/admin/finanzas");
    revalidatePath("/cuotas");
    return {
      ok: true,
      amount: totalCharged,
      concepts: receiptLines.map(
        (l) => `${l.label} ${formatCurrency(l.amount)}`,
      ),
    };
  }

  // —— Pago anual: un cobro cubre 12 meses consecutivos desde el mes elegido ——
  if (mode === "anual") {
    if (!year || !month || month < 1 || month > 12) {
      return { error: "Indica el mes de inicio del pago anual." };
    }
    const monthlyAmount = Number(
      formData.get("maintenanceAmount") ?? FEE_BASE_AMOUNT,
    );
    if (Number.isNaN(monthlyAmount) || monthlyAmount <= 0) {
      return { error: "Monto mensual inválido." };
    }

    const periods = feePeriodRange(year, month, FEE_ANNUAL_MONTHS);
    const end = periods[periods.length - 1]!;
    const account = await prisma.houseAccount.findUnique({
      where: { houseNumber },
      select: { hasConvenio: true },
    });
    const hasConvenio = account?.hasConvenio === true;

    if (!hasConvenio) {
      const priorUnpaid = await prisma.monthlyFee.findMany({
        where: {
          houseNumber,
          concept: FEE_CONCEPT.MANTENIMIENTO,
          status: { in: ["ADEUDO", "PENDIENTE"] },
          OR: [
            { year: { lt: year } },
            { year, month: { lt: month } },
          ],
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
        take: 6,
      });
      if (priorUnpaid.length) {
        const labels = priorUnpaid
          .map((f) => feeLabel(f.year, f.month))
          .join(", ");
        return {
          error: `Hay adeudos anteriores (${labels}). Límpialos con cobro o abono, o activa un convenio en esta casa.`,
        };
      }
    }

    const existingFees = await prisma.monthlyFee.findMany({
      where: {
        houseNumber,
        concept: FEE_CONCEPT.MANTENIMIENTO,
        OR: periods.map((p) => ({ year: p.year, month: p.month })),
      },
    });
    const byPeriod = new Map(
      existingFees.map((f) => [`${f.year}-${f.month}`, f]),
    );

    const toCover: {
      year: number;
      month: number;
      feeAmount: number;
      payAmount: number;
      existingId?: string;
      existingFinanceEntryId?: string | null;
    }[] = [];

    for (const p of periods) {
      const fee = byPeriod.get(`${p.year}-${p.month}`);
      if (fee?.status === "PAGADO") continue;
      const feeAmount = fee?.amount ?? monthlyAmount;
      const prevPaid = fee?.amountPaid ?? 0;
      const payAmount = Math.max(0, feeAmount - prevPaid);
      if (payAmount <= 0 && fee) {
        // Ya liquidado en monto pero sin status PAGADO: forzar cierre.
        toCover.push({
          year: p.year,
          month: p.month,
          feeAmount,
          payAmount: 0,
          existingId: fee.id,
          existingFinanceEntryId: fee.financeEntryId,
        });
        continue;
      }
      toCover.push({
        year: p.year,
        month: p.month,
        feeAmount,
        payAmount: payAmount || monthlyAmount,
        existingId: fee?.id,
        existingFinanceEntryId: fee?.financeEntryId,
      });
    }

    if (toCover.length === 0) {
      return {
        error: `Los ${FEE_ANNUAL_MONTHS} meses desde ${feeLabel(year, month)} ya están pagados.`,
      };
    }

    const paidAt = new Date();
    const total = toCover.reduce(
      (s, p) => s + (p.payAmount > 0 ? p.payAmount : 0),
      0,
    );
    // Si todos tenían payAmount 0 (edge), cobra al menos el mensual × meses.
    const chargeTotal =
      total > 0 ? total : monthlyAmount * toCover.length;
    const rangeLabel = `${feeLabel(year, month)}–${feeLabel(end.year, end.month)}`;
    const coveredLabels = toCover
      .map((p) => feeLabel(p.year, p.month))
      .join(", ");

    const entry = await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Cuotas",
        description: `Casa ${houseNumber} · Pago anual ${rangeLabel} · ${toCover.length} meses · ${coveredLabels}`,
        amount: chargeTotal,
        date: paidAt,
        status: "PENDING",
      },
    });

    let linkedFirst = false;
    for (const p of toCover) {
      const linkEntry = !linkedFirst && !p.existingFinanceEntryId;
      if (linkEntry) linkedFirst = true;

      await prisma.monthlyFee.upsert({
        where: {
          houseNumber_year_month_concept: {
            houseNumber,
            year: p.year,
            month: p.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
          },
        },
        create: {
          houseNumber,
          year: p.year,
          month: p.month,
          concept: FEE_CONCEPT.MANTENIMIENTO,
          amount: p.feeAmount,
          amountPaid: p.feeAmount,
          status: "PAGADO",
          withSurcharge: false,
          paidAt,
          ...(linkEntry ? { financeEntryId: entry.id } : {}),
        },
        update: {
          amount: p.feeAmount,
          amountPaid: p.feeAmount,
          status: "PAGADO",
          withSurcharge: false,
          paidAt,
          ...(linkEntry ? { financeEntryId: entry.id } : {}),
        },
      });
    }

    const residents = await prisma.user.findMany({
      where: { houseNumber, role: { in: ["COLONO", "ADMIN"] } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (residents.length) {
      await prisma.notification.createMany({
        data: residents.map((r) => ({
          userId: r.id,
          title: "Pago anual registrado",
          body: `Casa ${houseNumber} · ${toCover.length} meses (${rangeLabel}) · ${formatCurrency(chargeTotal)}.`,
        })),
      });
      const privada = await getPrivada();
      after(() => {
        void Promise.all(
          residents.map((r) =>
            sendPaymentReceiptEmail({
              residentName: fullName(r),
              residentEmail: r.email,
              houseNumber,
              periodLabel: `Anual ${rangeLabel}`,
              lines: [
                {
                  label: `Mantenimiento × ${toCover.length} meses`,
                  amount: chargeTotal,
                },
              ],
              total: chargeTotal,
              paidAt,
              privadaName: privada.name,
              privadaAddress: privada.address,
              privadaEmail: privada.email,
              privadaPhone: privada.phone,
            }),
          ),
        ).catch((err) => console.error("[anual] email failed", err));
      });
    }

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/cobranza/matriz");
    revalidatePath("/admin/finanzas");
    revalidatePath("/cuotas");
    return {
      ok: true,
      amount: chargeTotal,
      concepts: [
        `Pago anual ${rangeLabel} (${toCover.length} meses)`,
      ],
    };
  }

  if (!year || !month || month < 1 || month > 12) {
    return { error: "Selecciona casa, año y mes." };
  }
  if (!includeMaintenance && !includePalapa) {
    return { error: "Elige al menos un concepto a cobrar." };
  }
  if (includeMaintenance && (Number.isNaN(maintenanceAmount) || maintenanceAmount < 0)) {
    return { error: "Monto de mantenimiento inválido." };
  }
  if (includeLate && (!includeMaintenance || Number.isNaN(lateAmount) || lateAmount < 0)) {
    return { error: "El recargo solo aplica con mantenimiento y monto válido." };
  }
  if (includePalapa && (Number.isNaN(palapaAmount) || palapaAmount <= 0)) {
    return { error: "Monto de palapa inválido." };
  }

  // No cobrar mantenimiento de un mes posterior si hay adeudos anteriores,
  // salvo que la casa tenga convenio de pago activo.
  if (includeMaintenance) {
    const account = await prisma.houseAccount.findUnique({
      where: { houseNumber },
      select: { hasConvenio: true },
    });
    const hasConvenio = account?.hasConvenio === true;

    if (!hasConvenio) {
      const priorUnpaid = await prisma.monthlyFee.findMany({
        where: {
          houseNumber,
          concept: FEE_CONCEPT.MANTENIMIENTO,
          status: { in: ["ADEUDO", "PENDIENTE"] },
          OR: [
            { year: { lt: year } },
            { year, month: { lt: month } },
          ],
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
        take: 6,
      });
      if (priorUnpaid.length) {
        const labels = priorUnpaid
          .map((f) => feeLabel(f.year, f.month))
          .join(", ");
        return {
          error: `No se puede cobrar ${feeLabel(year, month)} mientras haya adeudos anteriores (${labels}). Cobra primero el mes más antiguo, registra un abono, o activa un convenio.`,
        };
      }
    }
  }

  const paidAt = new Date();
  const label = feeLabel(year, month);
  const parts: string[] = [];
  const receiptLines: PaymentReceiptLine[] = [];
  let total = 0;

  if (includeMaintenance) {
    const applyLate = includeLate;
    const pendingFines = await prisma.fine.findMany({
      where: {
        houseNumber,
        billingYear: year,
        billingMonth: month,
        status: "PENDIENTE",
      },
      orderBy: { issuedAt: "asc" },
    });
    const finesTotal = pendingFines.reduce((sum, f) => sum + f.amount, 0);
    const maintTotal = maintenanceAmount + (applyLate ? lateAmount : 0);
    const descParts = [FEE_CONCEPT_LABEL.MANTENIMIENTO];
    if (finesTotal > 0) {
      descParts.push(
        `${pendingFines.length} multa${pendingFines.length === 1 ? "" : "s"} $${finesTotal}`,
      );
    }
    if (applyLate) descParts.push(`recargo $${lateAmount}`);
    const description = `Casa ${houseNumber} · ${label} · ${descParts.join(" + ")}`;

    const existingFee = await prisma.monthlyFee.findUnique({
      where: {
        houseNumber_year_month_concept: {
          houseNumber,
          year,
          month,
          concept: FEE_CONCEPT.MANTENIMIENTO,
        },
      },
    });

    // Si el monto cobrado es menor al saldo del periodo → abono parcial del mes.
    const remainingOwed = existingFee
      ? Math.max(0, existingFee.amount - existingFee.amountPaid)
      : maintTotal;
    const partial =
      existingFee != null &&
      existingFee.status !== "PAGADO" &&
      maintTotal + 0.01 < remainingOwed;

    const res = await upsertPaidConcept({
      houseNumber,
      year,
      month,
      concept: FEE_CONCEPT.MANTENIMIENTO,
      amount: maintTotal,
      description,
      paidAt,
      withSurcharge: applyLate && lateAmount > 0,
      partial,
    });
    if ("error" in res) return res;
    total += res.amount;
    parts.push(`${FEE_CONCEPT_LABEL.MANTENIMIENTO} $${maintTotal}`);

    const basePortion = Math.max(0, maintenanceAmount - finesTotal);
    if (basePortion > 0) {
      receiptLines.push({
        label: FEE_CONCEPT_LABEL.MANTENIMIENTO,
        amount: basePortion,
      });
    }
    for (const f of pendingFines) {
      receiptLines.push({
        label: `Multa · ${f.cause}`,
        amount: f.amount,
      });
    }
    if (applyLate && lateAmount > 0) {
      receiptLines.push({
        label: "Recargo por pago tardío",
        amount: lateAmount,
      });
    }
    if (receiptLines.length === 0) {
      receiptLines.push({
        label: applyLate
          ? `${FEE_CONCEPT_LABEL.MANTENIMIENTO} (incluye recargo)`
          : FEE_CONCEPT_LABEL.MANTENIMIENTO,
        amount: maintTotal,
      });
    }

    // Solo marcar multas pagadas si el periodo quedó liquidado (no abono parcial).
    if (pendingFines.length && !partial) {
      await prisma.fine.updateMany({
        where: {
          id: { in: pendingFines.map((f) => f.id) },
        },
        data: {
          status: "PAGADO",
          paidAt,
        },
      });
    }
  }

  if (includePalapa) {
    await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Palapa",
        description: `Casa ${houseNumber} · Uso de palapa · ${label}`,
        amount: palapaAmount,
        date: paidAt,
        status: "PENDING",
        palapaPayment: {
          create: {
            houseNumber,
            amount: palapaAmount,
            paidAt,
          },
        },
      },
    });
    total += palapaAmount;
    parts.push(`${FEE_CONCEPT_LABEL.PALAPA} $${palapaAmount}`);
    receiptLines.push({
      label: FEE_CONCEPT_LABEL.PALAPA,
      amount: palapaAmount,
    });
  }

  const residents = await prisma.user.findMany({
    where: { houseNumber, role: "COLONO" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  if (residents.length) {
    await prisma.notification.createMany({
      data: residents.map((r) => ({
        userId: r.id,
        title: "Pago registrado",
        body: `Casa ${houseNumber} · ${label}: ${parts.join(", ")} (total $${total}). Pendiente de validar en Tesorería.`,
      })),
    });

    const privada = await getPrivada();
    after(() => {
      void Promise.all(
        residents.map((r) =>
          sendPaymentReceiptEmail({
            residentName: fullName(r),
            residentEmail: r.email,
            houseNumber,
            periodLabel: label,
            lines: receiptLines,
            total,
            paidAt,
            privadaName: privada.name,
            privadaAddress: privada.address,
            privadaEmail: privada.email,
            privadaPhone: privada.phone,
          }),
        ),
      ).catch((err) => console.error("[cobranza] email receipt failed", err));
    });
  }

  revalidatePath("/admin/cobranza");
  revalidatePath("/admin/cobranza/matriz");
  revalidatePath("/admin/finanzas");
  revalidatePath("/cuotas");
  return { ok: true, amount: total, concepts: parts };
}

/** Compatibilidad: redirige al flujo de cobranza de mantenimiento. */
export async function upsertMonthlyFee(formData: FormData) {
  if (!formData.has("includeMaintenance") && !formData.has("includePalapa")) {
    formData.set("includeMaintenance", "on");
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const paidAt = new Date();
    formData.set("maintenanceAmount", String(FEE_BASE_AMOUNT));
    if (isFeePaymentLate(year, month, paidAt)) {
      formData.set("includeLate", "on");
      formData.set("lateAmount", String(FEE_LATE_SURCHARGE));
    }
  }
  return registerCobranza(formData);
}

function parseEntryDate(raw: string) {
  const value = raw.trim();
  if (!value) return new Date();
  // YYYY-MM-DD from <input type="date">
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function createFinanceEntry(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "GASTO").toUpperCase();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const date = parseEntryDate(String(formData.get("date") ?? ""));

  if (!["INGRESO", "GASTO"].includes(type)) {
    return { error: "Tipo inválido. Usa Ingreso o Gasto." };
  }
  if (!category || !description || !amount || amount <= 0) {
    return { error: "Completa categoría, descripción y monto válido." };
  }

  const fullDescription = notes ? `${description} · ${notes}` : description;

  await prisma.financeEntry.create({
    data: {
      type,
      category,
      description: fullDescription,
      amount,
      date,
      // Gastos e ingresos manuales de tesorería entran ya publicados.
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  revalidatePath("/finanzas");
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Edita un ingreso pendiente de validar en Tesorería. */
export async function updatePendingFinanceEntry(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const dateRaw = String(formData.get("date") ?? "").trim();

  if (!id || !category || !description || !amount || amount <= 0) {
    return { error: "Completa categoría, descripción y monto." };
  }

  const entry = await prisma.financeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { error: "Solo se pueden editar ingresos pendientes." };
  }

  await prisma.financeEntry.update({
    where: { id },
    data: {
      category,
      description,
      amount,
      ...(dateRaw ? { date: parseEntryDate(dateRaw) } : {}),
    },
  });
  revalidatePath("/admin/finanzas");
  revalidatePath("/finanzas");
  return { ok: true };
}

/** Publica un ingreso pendiente: ya cuenta en el saldo visible. */
export async function approveFinanceEntry(id: string) {
  await requireAdmin();
  if (!id) return { error: "Movimiento inválido." };
  const entry = await prisma.financeEntry.findUnique({ where: { id } });
  if (!entry) return { error: "No encontrado." };
  if (entry.status !== "PENDING") {
    return { error: "Este movimiento ya está publicado." };
  }

  await prisma.financeEntry.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidatePath("/admin/finanzas");
  revalidatePath("/finanzas");
  return { ok: true };
}

/** Descarta un ingreso pendiente (no revierte el cobro operativo de cuotas). */
export async function rejectPendingFinanceEntry(id: string) {
  await requireAdmin();
  if (!id) return { error: "Movimiento inválido." };
  const entry = await prisma.financeEntry.findUnique({
    where: { id },
    include: {
      monthlyFee: { select: { id: true } },
      palapaPayment: { select: { id: true } },
    },
  });
  if (!entry || entry.status !== "PENDING") {
    return { error: "Solo se pueden descartar pendientes." };
  }
  // Desligar antes de borrar si aplica.
  if (entry.monthlyFee) {
    await prisma.monthlyFee.update({
      where: { id: entry.monthlyFee.id },
      data: { financeEntryId: null },
    });
  }
  if (entry.palapaPayment) {
    await prisma.palapaPayment.update({
      where: { id: entry.palapaPayment.id },
      data: { financeEntryId: null },
    });
  }
  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function updateFinanceEntry(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const type = String(formData.get("type") ?? "GASTO").toUpperCase();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const dateRaw = String(formData.get("date") ?? "").trim();

  if (!id || !category || !description || !amount || amount <= 0) {
    return { error: "Completa todos los campos." };
  }
  if (!["INGRESO", "GASTO"].includes(type)) {
    return { error: "Tipo inválido." };
  }

  await prisma.financeEntry.update({
    where: { id },
    data: {
      type,
      category,
      description,
      amount,
      ...(dateRaw ? { date: parseEntryDate(dateRaw) } : {}),
    },
  });
  revalidatePath("/finanzas");
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function deleteFinanceEntry(id: string) {
  await requireAdmin();
  if (!id) return { error: "Movimiento inválido." };
  const entry = await prisma.financeEntry.findUnique({
    where: { id },
    include: {
      monthlyFee: { select: { id: true } },
      palapaPayment: { select: { id: true } },
      fine: { select: { id: true } },
    },
  });
  if (!entry) return { error: "Movimiento no encontrado." };
  if (entry.monthlyFee || entry.palapaPayment || entry.fine) {
    return {
      error:
        "No se puede eliminar un movimiento ligado a una cuota, palapa o multa.",
    };
  }
  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath("/finanzas");
  revalidatePath("/admin/finanzas");
  revalidatePath("/cuotas");
  return { ok: true };
}

/** Emite una multa y la suma a la cuota de mantenimiento del periodo aplicable. */
export async function issueFine(formData: FormData) {
  const admin = await requireAdmin();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();
  const causeId = String(formData.get("causeId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!houseNumber) return { error: "Selecciona la casa." };
  if (!causeId) return { error: "Selecciona la falta." };
  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Indica un monto válido mayor a cero." };
  }

  const cause = getFineCauseById(causeId);
  if (!cause) return { error: "La falta seleccionada no es válida." };

  const issuedAt = new Date();
  const { year: cy, month: cm } = calendarPartsInTijuana(issuedAt);

  const [unpaidFees, currentMonthFee] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: {
        houseNumber,
        concept: FEE_CONCEPT.MANTENIMIENTO,
        status: { in: ["ADEUDO", "PENDIENTE"] },
      },
      select: { year: true, month: true, status: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.monthlyFee.findUnique({
      where: {
        houseNumber_year_month_concept: {
          houseNumber,
          year: cy,
          month: cm,
          concept: FEE_CONCEPT.MANTENIMIENTO,
        },
      },
      select: { status: true },
    }),
  ]);

  let billing = pickFineBillingPeriod({
    asOf: issuedAt,
    unpaidFees,
    currentMonthFeeStatus: currentMonthFee?.status ?? null,
  });

  // Si ese periodo ya está pagado (carrera rara), pasar al siguiente mes abierto.
  for (let i = 0; i < 24; i++) {
    const existing = await prisma.monthlyFee.findUnique({
      where: {
        houseNumber_year_month_concept: {
          houseNumber,
          year: billing.year,
          month: billing.month,
          concept: FEE_CONCEPT.MANTENIMIENTO,
        },
      },
    });
    if (!existing || existing.status !== "PAGADO") break;
    billing = nextFeePeriod(billing.year, billing.month);
  }

  const fine = await prisma.$transaction(async (tx) => {
    const created = await tx.fine.create({
      data: {
        houseNumber,
        category: cause.category,
        cause: cause.label,
        causeId: cause.id,
        regulationArticle: cause.article,
        regulationExcerpt: cause.excerpt,
        amount,
        notes,
        status: "PENDIENTE",
        billingYear: billing.year,
        billingMonth: billing.month,
        issuedAt,
        issuedById: admin.id,
      },
    });

    // Solo sumar a la cuota si el periodo ya es exigible (mes actual o anterior).
    // En meses futuros solo queda la multa; la cuota base se cobra cuando toque.
    const billingKey = billing.year * 12 + billing.month;
    const currentKey = cy * 12 + cm;
    if (billingKey <= currentKey) {
      const fee = await tx.monthlyFee.findUnique({
        where: {
          houseNumber_year_month_concept: {
            houseNumber,
            year: billing.year,
            month: billing.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
          },
        },
      });

      if (!fee) {
        await tx.monthlyFee.create({
          data: {
            houseNumber,
            year: billing.year,
            month: billing.month,
            concept: FEE_CONCEPT.MANTENIMIENTO,
            amount: FEE_BASE_AMOUNT + amount,
            status: "PENDIENTE",
          },
        });
      } else if (fee.status !== "PAGADO") {
        await tx.monthlyFee.update({
          where: { id: fee.id },
          data: { amount: fee.amount + amount },
        });
      }
    }

    return created;
  });

  const periodLabel = feeLabel(billing.year, billing.month);
  const residents = await prisma.user.findMany({
    where: { houseNumber, role: "COLONO" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (residents.length) {
    await prisma.notification.createMany({
      data: residents.map((r) => ({
        userId: r.id,
        title: "Multa aplicada",
        body: `Casa ${houseNumber} · ${cause.label} · ${formatCurrency(amount)} · se suma a cuota ${periodLabel}.`,
        fineId: fine.id,
      })),
    });

    const privada = await getPrivada();
    after(() => {
      void Promise.all(
        residents.map((r) =>
          sendFineNoticeEmail({
            residentName: fullName(r),
            residentEmail: r.email,
            houseNumber,
            category: cause.category,
            cause: cause.label,
            regulationArticle: cause.article,
            regulationExcerpt: cause.excerpt,
            amount,
            notes,
            issuedAt,
            billingPeriodLabel: periodLabel,
            privadaName: privada.name,
            privadaAddress: privada.address,
            privadaEmail: privada.email,
            privadaPhone: privada.phone,
          }),
        ),
      ).catch((err) => console.error("[multa] email notice failed", err));
    });
  }

  revalidatePath("/admin/multas");
  revalidatePath("/admin/cobranza");
  revalidatePath("/cuotas");
  return {
    ok: true,
    fineId: fine.id,
    billingYear: billing.year,
    billingMonth: billing.month,
  };
}

/** Las multas se cobran con la cuota; no hay cobro suelto. */
export async function markFinePaid(_fineId: string) {
  await requireAdmin();
  return {
    error:
      "Las multas se cobran junto con la cuota de mantenimiento del periodo indicado. Regístrala en Cobranza de cuotas.",
  };
}

export async function annulFine(fineId: string) {
  await requireAdmin();
  if (!fineId) return { error: "Multa inválida." };

  const fine = await prisma.fine.findUnique({ where: { id: fineId } });
  if (!fine) return { error: "No se encontró la multa." };
  if (fine.status !== "PENDIENTE") {
    return { error: "Solo se pueden anular multas pendientes." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.fine.update({
      where: { id: fineId },
      data: { status: "ANULADA" },
    });

    const fee = await tx.monthlyFee.findUnique({
      where: {
        houseNumber_year_month_concept: {
          houseNumber: fine.houseNumber,
          year: fine.billingYear,
          month: fine.billingMonth,
          concept: FEE_CONCEPT.MANTENIMIENTO,
        },
      },
    });

    if (fee && fee.status !== "PAGADO") {
      const { year: cy, month: cm } = calendarPartsInTijuana();
      const isFuture = fee.year * 12 + fee.month > cy * 12 + cm;
      const nextAmount = fee.amount - fine.amount;
      // Cuotas futuras creadas solo por multas: si ya no queda multa, borrar el renglón.
      if (isFuture && nextAmount <= FEE_BASE_AMOUNT) {
        await tx.monthlyFee.delete({ where: { id: fee.id } });
      } else {
        await tx.monthlyFee.update({
          where: { id: fee.id },
          data: { amount: Math.max(FEE_BASE_AMOUNT, nextAmount) },
        });
      }
    }
  });

  revalidatePath("/cuotas");
  revalidatePath("/admin");
  revalidatePath("/notificaciones");
  return { ok: true };
}

const MAX_ISSUE_PHOTOS = 4;

function parseClientUploads(raw: string): { url: string; name: string | null }[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const url = String((item as { url?: unknown }).url ?? "").trim();
        if (!url.startsWith("https://") && !url.startsWith("/")) return null;
        const name = String((item as { name?: unknown }).name ?? "").trim() || null;
        return { url, name };
      })
      .filter((x): x is { url: string; name: string | null } => Boolean(x))
      .slice(0, MAX_ISSUE_PHOTOS);
  } catch {
    return [];
  }
}

export async function createIssueReport(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const clientPhotos = parseClientUploads(
    String(formData.get("photoUrls") ?? ""),
  );
  const files = formData.getAll("photos");

  if (!title || !description || !category) {
    return { error: "Título, categoría y descripción son obligatorios." };
  }
  if (!ISSUE_CATEGORIES.includes(category as (typeof ISSUE_CATEGORIES)[number])) {
    return { error: "Categoría inválida." };
  }

  const uploads: { url: string; name: string | null }[] = [...clientPhotos];

  // Fallback: subida por servidor (archivos pequeños / escritorio).
  if (uploads.length === 0) {
    try {
      for (const entry of files.slice(0, MAX_ISSUE_PHOTOS)) {
        const file = fileFromFormData(entry);
        if (!file) continue;
        const saved = await saveUploadedDocument(file, { folder: "reports" });
        if (saved.documentUrl) {
          uploads.push({
            url: saved.documentUrl,
            name: saved.documentName,
          });
        }
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron subir las fotos.",
      };
    }
  }

  if (uploads.length === 0) {
    return {
      error: "Agrega al menos una foto del desperfecto (JPG, PNG o WEBP).",
    };
  }

  const report = await prisma.issueReport.create({
    data: {
      title,
      description,
      category,
      location,
      houseNumber: user.houseNumber,
      reporterId: user.id,
      photos: {
        create: uploads.map((p) => ({
          url: p.url,
          name: p.name,
        })),
      },
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length) {
    const casa = user.houseNumber ? `Casa ${user.houseNumber}` : "Sin casa";
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Nuevo reporte de desperfecto",
        body: `${casa}: ${title}`,
        issueReportId: report.id,
      })),
    });
  }

  revalidatePath("/reportes");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  revalidatePath("/notificaciones");
  return { ok: true, id: report.id };
}

export async function updateIssueReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as
    | "ABIERTO"
    | "EN_REVISION"
    | "RESUELTO"
    | "CERRADO";
  const adminNotes = String(formData.get("adminNotes") ?? "").trim() || null;

  if (!id) return { error: "Reporte inválido." };
  if (!["ABIERTO", "EN_REVISION", "RESUELTO", "CERRADO"].includes(status)) {
    return { error: "Estado inválido." };
  }

  const existing = await prisma.issueReport.findUnique({ where: { id } });
  if (!existing) return { error: "Reporte no encontrado." };

  const becameResolved =
    (status === "RESUELTO" || status === "CERRADO") &&
    existing.status !== "RESUELTO" &&
    existing.status !== "CERRADO";

  await prisma.issueReport.update({
    where: { id },
    data: {
      status,
      adminNotes,
      resolvedAt: becameResolved
        ? new Date()
        : status === "ABIERTO" || status === "EN_REVISION"
          ? null
          : existing.resolvedAt,
    },
  });

  if (becameResolved) {
    await prisma.notification.create({
      data: {
        userId: existing.reporterId,
        title:
          status === "RESUELTO"
            ? "Tu reporte fue marcado como resuelto"
            : "Tu reporte fue cerrado",
        body: existing.title,
        issueReportId: existing.id,
      },
    });
  }

  revalidatePath("/reportes");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  revalidatePath("/notificaciones");
  return { ok: true };
}

async function ensurePrivadaRow() {
  const existing = await prisma.privadaSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.privadaSettings.create({
    data: {
      id: 1,
      name: "Grenache",
      address: "Priv. Grenache 4176, Fracc. Viñas del Mar",
      phone: "+52 (664) 356-4100",
      email: "comitegrenache@gmail.com",
      tagline:
        "Comunidad residencial comprometida con la excelencia y el bienestar de todos sus residentes.",
      capacityMax: 50,
      capacityNote: "Capacidad máxima del salón",
      schedulesJson: JSON.stringify([
        { days: "Domingo a Jueves", hours: "12:00 pm - 22:00 pm" },
        { days: "Viernes y Sábado", hours: "12:00 pm - 2:00 am" },
      ]),
      rulesJson: JSON.stringify([
        "Las reservaciones deben realizarse con al menos una semana de anticipación.",
        "El área común puede reservarse por un máximo de 6 horas consecutivas.",
        "El residente responsable debe estar presente durante todo el evento.",
        "Está prohibido el uso de equipos de sonido después de las 22:00 hrs.",
        "Se debe dejar el área en las mismas condiciones en que se encontró.",
      ]),
      primaryColor: "#4f334a",
      slug: "grenache",
    },
  });
}

/** Actualiza datos de contacto, capacidad, horarios y reglamento. */
export async function updatePrivadaInfo(formData: FormData) {
  await requireAdmin();
  await ensurePrivadaRow();

  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const capacityMax = Number(formData.get("capacityMax") ?? 50);
  const capacityNote = String(formData.get("capacityNote") ?? "").trim() || null;
  const schedulesRaw = String(formData.get("schedulesJson") ?? "[]");
  const rulesRaw = String(formData.get("rulesJson") ?? "[]");

  if (!address || !phone || !email) {
    return { error: "Completa dirección, teléfono y correo." };
  }
  if (!Number.isFinite(capacityMax) || capacityMax < 1 || capacityMax > 500) {
    return { error: "La capacidad debe ser entre 1 y 500." };
  }

  let schedulesJson = "[]";
  let rulesJson = "[]";
  try {
    const schedules = JSON.parse(schedulesRaw) as unknown;
    if (!Array.isArray(schedules)) throw new Error("invalid");
    schedulesJson = JSON.stringify(
      schedules
        .map((s) => ({
          days: String((s as { days?: unknown })?.days ?? "").trim(),
          hours: String((s as { hours?: unknown })?.hours ?? "").trim(),
        }))
        .filter((s) => s.days && s.hours),
    );
  } catch {
    return { error: "Horarios inválidos." };
  }
  try {
    const rules = JSON.parse(rulesRaw) as unknown;
    if (!Array.isArray(rules)) throw new Error("invalid");
    rulesJson = JSON.stringify(
      rules.map((r) => String(r ?? "").trim()).filter(Boolean),
    );
  } catch {
    return { error: "Reglamento inválido." };
  }

  await prisma.privadaSettings.update({
    where: { id: 1 },
    data: {
      address,
      phone,
      email,
      capacityMax,
      capacityNote,
      schedulesJson,
      rulesJson,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/informacion");
  revalidatePath("/reservaciones");
  return { ok: true };
}

/** Actualiza identidad visual: nombre, logo, color y slug. */
export async function updatePrivadaBranding(formData: FormData) {
  await requireAdmin();
  await ensurePrivadaRow();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const removeLogo = formData.get("removeLogo") === "on";
  const logoFile = formData.get("logo");

  if (!name) return { error: "El nombre de la privada es obligatorio." };

  const { normalizePrimaryColor, slugifyPrivadaName } = await import(
    "@/lib/privada"
  );
  const color = normalizePrimaryColor(primaryColor);
  const slug =
    slugRaw
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || slugifyPrivadaName(name);

  let logoUrl: string | null | undefined = undefined;
  if (removeLogo) {
    logoUrl = null;
  } else {
    try {
      const saved = await saveUploadedDocument(fileFromFormData(logoFile), {
        folder: "brand",
      });
      if (saved.documentUrl) logoUrl = saved.documentUrl;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo subir el logo.",
      };
    }
  }

  await prisma.privadaSettings.update({
    where: { id: 1 },
    data: {
      name,
      tagline:
        tagline ||
        "Comunidad residencial comprometida con la excelencia y el bienestar de todos sus residentes.",
      primaryColor: color,
      slug,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/personalizacion");
  revalidatePath("/login");
  return { ok: true };
}
