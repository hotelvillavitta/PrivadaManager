/** Shared helpers for in-app notification deep-links. */

export type NotificationLinkItem = {
  title: string;
  body?: string;
  newsId?: string | null;
  reservationId?: string | null;
  fineId?: string | null;
};

export type NotificationKind =
  | "reserva"
  | "noticia"
  | "multa"
  | "pago"
  | "general";

export function notificationKind(n: NotificationLinkItem): NotificationKind {
  if (n.reservationId) return "reserva";
  if (n.newsId) return "noticia";
  if (n.fineId) return "multa";
  const t = `${n.title} ${n.body ?? ""}`.toLowerCase();
  if (t.includes("multa") || t.includes("sanción") || t.includes("sancion")) {
    return "multa";
  }
  if (t.includes("cuota") || t.includes("pago") || t.includes("cobro")) {
    return "pago";
  }
  if (t.includes("reserv") || t.includes("palapa")) return "reserva";
  if (t.includes("comunicado") || t.includes("noticia") || t.includes("aviso")) {
    return "noticia";
  }
  return "general";
}

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  reserva: "Reservación",
  noticia: "Aviso",
  multa: "Multa",
  pago: "Cuotas",
  general: "Aviso",
};

export function hrefForNotification(n: NotificationLinkItem): string | null {
  if (n.reservationId) {
    return `/reservaciones?solicitud=${n.reservationId}`;
  }
  if (n.newsId) return `/noticias/${n.newsId}`;
  if (n.fineId) return "/cuotas#multas";
  const t = n.title.toLowerCase();
  if (t.includes("multa") || t.includes("sanción") || t.includes("sancion")) {
    return "/cuotas#multas";
  }
  if (t.includes("cuota") || t.includes("pago")) return "/cuotas";
  if (t.includes("reserv") || t.includes("palapa")) return "/reservaciones";
  if (t.includes("comunicado") || t.includes("noticia") || t.includes("aviso")) {
    return "/noticias";
  }
  return null;
}

export function relativeTimeEs(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export function notificationGroupLabel(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = start(new Date()) - start(date);
  const day = 86_400_000;
  if (diff < day) return "Hoy";
  if (diff < 2 * day) return "Ayer";
  if (diff < 7 * day) return "Esta semana";
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
