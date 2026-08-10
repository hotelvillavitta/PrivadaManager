"use server";

import { revalidatePath } from "next/cache";
import type { NewsCategory, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

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

export async function createNewsPost(formData: FormData) {
  const user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "AVISO") as NewsCategory;
  const hasDocument = formData.get("hasDocument") === "on";

  if (!title || !body) {
    return { error: "Título y contenido son obligatorios." };
  }

  await prisma.newsPost.create({
    data: {
      title,
      body,
      category,
      hasDocument,
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
      })),
    });
  }

  revalidatePath("/noticias");
  return { ok: true };
}

export async function createReservation(formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const guests = Number(formData.get("guests") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date || !eventName || !guests) {
    return { error: "Completa fecha, evento e invitados." };
  }
  if (guests < 1 || guests > 50) {
    return { error: "La capacidad máxima es de 50 personas." };
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

  await prisma.reservation.create({
    data: {
      date,
      eventName,
      guests,
      notes,
      userId: user.id,
      status: "PENDING",
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Nueva solicitud de palapa",
        body: `${eventName} — ${date}`,
      })),
    });
  }

  revalidatePath("/reservaciones");
  return { ok: true };
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
) {
  await requireAdmin();

  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status },
    include: { user: true },
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
      body: `${reservation.eventName} (${reservation.date})`,
    },
  });

  revalidatePath("/reservaciones");
  revalidatePath("/admin");
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

export async function markNotificationsRead(_formData?: FormData) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/");
  revalidatePath("/comunidad");
}

export async function upsertMonthlyFee(formData: FormData) {
  await requireAdmin();
  const houseNumber = String(formData.get("houseNumber") ?? "").trim();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const status = String(formData.get("status") ?? "PENDIENTE") as
    | "PAGADO"
    | "ADEUDO"
    | "PENDIENTE";
  const amount = Number(formData.get("amount") ?? 1500);

  if (!houseNumber || !year || !month) {
    return { error: "Datos incompletos." };
  }

  await prisma.monthlyFee.upsert({
    where: {
      houseNumber_year_month: { houseNumber, year, month },
    },
    create: {
      houseNumber,
      year,
      month,
      status,
      amount,
      paidAt: status === "PAGADO" ? new Date() : null,
    },
    update: {
      status,
      amount,
      paidAt: status === "PAGADO" ? new Date() : null,
    },
  });

  revalidatePath("/cuotas");
  revalidatePath("/finanzas");
  revalidatePath("/admin");
  return { ok: true };
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
