/** Shared helpers for in-app notification deep-links. */

export type NotificationLinkItem = {
  title: string;
  newsId?: string | null;
  reservationId?: string | null;
  fineId?: string | null;
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
