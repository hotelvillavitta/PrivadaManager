"use server";

import { revalidatePath } from "next/cache";
import type { NewsCategory, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { saveUploadedDocument } from "@/lib/uploads";
import { overdueMaintenanceWhere } from "@/lib/utils";
import {
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
  revalidatePath(`/noticias/${newsId}`);
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

  if (!title || !body) {
    return { error: "Título y contenido son obligatorios." };
  }

  let documentUrl: string | null = null;
  let documentName: string | null = null;
  try {
    const saved = await saveUploadedDocument(
      file instanceof File ? file : null,
    );
    documentUrl = saved.documentUrl;
    documentName = saved.documentName;
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
  if (guests < 1 || guests > 50) {
    return { error: "La capacidad máxima es de 50 personas." };
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
    const saved = await saveUploadedDocument(
      file instanceof File ? file : null,
    );
    if (saved.documentUrl) {
      documentUrl = saved.documentUrl;
      documentName = saved.documentName;
      hasDocument = true;
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
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim() || null;
  const accessCode = String(formData.get("accessCode") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "COLONO") as "COLONO" | "ADMIN";

  if (!email || !firstName || !lastName) {
    return { error: "Nombre y correo son obligatorios." };
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
      role,
      mustChangePassword: true,
    },
  });

  const issued = await issueTemporaryPassword(user.id);
  if ("error" in issued) return issued;

  revalidatePath("/admin");
  revalidatePath("/cuotas");
  return issued;
}

export async function generateResidentPassword(userId: string) {
  await requireAdmin();
  if (!userId) return { error: "Residente inválido." };
  const issued = await issueTemporaryPassword(userId);
  revalidatePath("/admin");
  return issued;
}

export async function updateResident(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim() || null;
  const accessCode = String(formData.get("accessCode") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "COLONO") as "COLONO" | "ADMIN";

  if (!id || !email || !firstName || !lastName) {
    return { error: "Datos incompletos." };
  }
  if (role !== "COLONO" && role !== "ADMIN") {
    return { error: "Rol inválido." };
  }

  const other = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });
  if (other) return { error: "Ese correo ya está en uso." };

  await prisma.user.update({
    where: { id },
    data: { email, firstName, lastName, houseNumber, accessCode, role },
  });
  revalidatePath("/admin");
  revalidatePath("/cuotas");
  return { ok: true };
}

export async function deleteResident(id: string) {
  const admin = await requireAdmin();
  if (!id) return { error: "Residente inválido." };
  if (id === admin.id) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/cuotas");
  return { ok: true };
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

  let financeEntryId = existing?.financeEntryId ?? null;
  if (financeEntryId) {
    await prisma.financeEntry.update({
      where: { id: financeEntryId },
      data: {
        type: "INGRESO",
        category: "Cuotas",
        description,
        amount,
        date: paidAt,
      },
    });
  } else {
    const entry = await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Cuotas",
        description,
        amount,
        date: paidAt,
      },
    });
    financeEntryId = entry.id;
  }

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
      status: "PAGADO",
      amount,
      withSurcharge,
      paidAt,
      financeEntryId,
    },
    update: {
      status: "PAGADO",
      amount,
      withSurcharge,
      paidAt,
      financeEntryId,
    },
  });

  return { ok: true as const, feeId: fee.id, amount };
}

/** Cobranza: mantenimiento (+ recargo opcional) y/o usos independientes de palapa. */
export async function registerCobranza(formData: FormData) {
  await requireAdmin();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();
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

  if (!houseNumber || !year || !month || month < 1 || month > 12) {
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

  // No cobrar mantenimiento de un mes posterior si hay adeudos anteriores.
  if (includeMaintenance) {
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
      const labels = priorUnpaid.map((f) => feeLabel(f.year, f.month)).join(", ");
      return {
        error: `No se puede cobrar ${feeLabel(year, month)} mientras haya adeudos anteriores (${labels}). Cobra primero el mes más antiguo.`,
      };
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

    const res = await upsertPaidConcept({
      houseNumber,
      year,
      month,
      concept: FEE_CONCEPT.MANTENIMIENTO,
      amount: maintTotal,
      description,
      paidAt,
      withSurcharge: applyLate && lateAmount > 0,
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
    // Si el admin ajustó el monto y no cuadra con base+multas, una sola línea.
    if (receiptLines.length === 0) {
      receiptLines.push({
        label: applyLate
          ? `${FEE_CONCEPT_LABEL.MANTENIMIENTO} (incluye recargo)`
          : FEE_CONCEPT_LABEL.MANTENIMIENTO,
        amount: maintTotal,
      });
    }

    if (pendingFines.length) {
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
    // Cada uso de palapa es un pago independiente: no se limita por mes y
    // no se registra en MonthlyFee (historial de cuotas de mantenimiento).
    await prisma.financeEntry.create({
      data: {
        type: "INGRESO",
        category: "Palapa",
        description: `Casa ${houseNumber} · Uso de palapa · ${label}`,
        amount: palapaAmount,
        date: paidAt,
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
        body: `Casa ${houseNumber} · ${label}: ${parts.join(", ")} (total $${total}).`,
      })),
    });

    const privada = await getPrivada();
    await Promise.all(
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
    );
  }

  revalidatePath("/cuotas");
  revalidatePath("/finanzas");
  revalidatePath("/admin");
  revalidatePath("/notificaciones");
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

export async function createFinanceEntry(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "GASTO");
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);

  if (!category || !description || !amount) {
    return { error: "Completa categoría, descripción y monto." };
  }

  await prisma.financeEntry.create({
    data: { type, category, description, amount },
  });

  revalidatePath("/finanzas");
  return { ok: true };
}

export async function updateFinanceEntry(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const type = String(formData.get("type") ?? "GASTO");
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);

  if (!id || !category || !description || !amount) {
    return { error: "Completa todos los campos." };
  }

  await prisma.financeEntry.update({
    where: { id },
    data: { type, category, description, amount },
  });
  revalidatePath("/finanzas");
  return { ok: true };
}

export async function deleteFinanceEntry(id: string) {
  await requireAdmin();
  if (!id) return { error: "Movimiento inválido." };
  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath("/finanzas");
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
    await Promise.all(
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
    );
  }

  revalidatePath("/cuotas");
  revalidatePath("/admin");
  revalidatePath("/notificaciones");
  revalidatePath("/finanzas");
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
