import "server-only";
import { sendEmail } from "@/lib/notify/email";
import type { NotifyResult } from "@/lib/notify/channels";

export type PaymentReceiptLine = {
  label: string;
  amount: number;
};

export type PaymentReceiptPayload = {
  residentName: string;
  residentEmail: string;
  houseNumber: string;
  periodLabel: string;
  lines: PaymentReceiptLine[];
  total: number;
  paidAt: Date;
  privadaName: string;
  privadaAddress?: string | null;
  privadaEmail?: string | null;
  privadaPhone?: string | null;
};

function money(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPaidAt(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Tijuana",
  }).format(d);
}

export function buildPaymentReceiptEmail(p: PaymentReceiptPayload) {
  const linesHtml = p.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;">${escapeHtml(l.label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${money(l.amount)}</td>
        </tr>`,
    )
    .join("");

  const linesText = p.lines
    .map((l) => `  - ${l.label}: ${money(l.amount)}`)
    .join("\n");

  // Asunto más “vecinal” y menos de marketing/spam.
  const subject = `${p.privadaName}: cuota registrada · Casa ${p.houseNumber} (${p.periodLabel})`;

  const contactBits = [p.privadaEmail, p.privadaPhone].filter(Boolean);
  const footerBits = [
    p.privadaName,
    p.privadaAddress,
    contactBits.length ? contactBits.join(" · ") : null,
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222;font-size:15px;line-height:1.5;">
  <p style="margin:0 0 16px;">Hola ${escapeHtml(p.residentName)},</p>
  <p style="margin:0 0 16px;">
    Te confirmamos que el comité de <strong>${escapeHtml(p.privadaName)}</strong>
    registró tu pago de cuota. Guarda este correo como comprobante.
  </p>
  <p style="margin:0 0 8px;"><strong>Casa:</strong> ${escapeHtml(p.houseNumber)}<br>
  <strong>Periodo:</strong> ${escapeHtml(p.periodLabel)}<br>
  <strong>Fecha:</strong> ${escapeHtml(formatPaidAt(p.paidAt))}</p>
  <table style="width:100%;max-width:480px;border-collapse:collapse;margin:16px 0;font-size:15px;">
    <thead>
      <tr>
        <th align="left" style="padding:8px 0;border-bottom:2px solid #222;">Concepto</th>
        <th align="right" style="padding:8px 0;border-bottom:2px solid #222;">Monto</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
    <tfoot>
      <tr>
        <td style="padding:12px 0 0;"><strong>Total</strong></td>
        <td style="padding:12px 0 0;text-align:right;"><strong>${money(p.total)}</strong></td>
      </tr>
    </tfoot>
  </table>
  <p style="margin:24px 0 0;font-size:13px;color:#555;">
    Si no reconoces este movimiento, responde a este correo para contactar al comité.
  </p>
  <p style="margin:16px 0 0;font-size:12px;color:#777;">
    ${footerBits.map((b) => escapeHtml(String(b))).join("<br>")}
  </p>
</body>
</html>`;

  const text = [
    `Hola ${p.residentName},`,
    ``,
    `Te confirmamos que el comité de ${p.privadaName} registró tu pago de cuota.`,
    `Guarda este correo como comprobante.`,
    ``,
    `Casa: ${p.houseNumber}`,
    `Periodo: ${p.periodLabel}`,
    `Fecha: ${formatPaidAt(p.paidAt)}`,
    ``,
    `Conceptos:`,
    linesText,
    ``,
    `Total: ${money(p.total)}`,
    ``,
    `Si no reconoces este movimiento, responde a este correo.`,
    ``,
    footerBits.join(" · "),
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Envía comprobante por correo a un residente. No lanza: falla en soft. */
export async function sendPaymentReceiptEmail(
  payload: PaymentReceiptPayload,
): Promise<NotifyResult> {
  const { subject, html, text } = buildPaymentReceiptEmail(payload);
  const result = await sendEmail({
    to: payload.residentEmail,
    subject,
    html,
    text,
    replyTo: payload.privadaEmail ?? undefined,
  });

  if (result.ok) {
    return { channel: "email", ok: true };
  }
  return {
    channel: "email",
    ok: false,
    skipped: "skipped" in result ? result.skipped : false,
    error: result.error,
  };
}

/**
 * Placeholder para WhatsApp (recibos, reservaciones, noticias).
 * Se activará cuando WHATSAPP_ENABLED=true y exista el proveedor.
 */
export async function sendPaymentReceiptWhatsApp(
  _payload: PaymentReceiptPayload,
): Promise<NotifyResult> {
  return {
    channel: "whatsapp",
    ok: false,
    skipped: true,
    error: "WhatsApp aún no está habilitado",
  };
}
