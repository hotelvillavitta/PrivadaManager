import "server-only";

/**
 * Canales de notificación a residentes.
 * Email: activo (comprobantes de pago).
 * WhatsApp: pendiente (recibos, reservaciones de palapa, noticias).
 */
export type NotifyChannel = "email" | "whatsapp";

export type NotifyResult = {
  channel: NotifyChannel;
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

export function isWhatsAppEnabled() {
  return Boolean(process.env.WHATSAPP_ENABLED === "true");
}
