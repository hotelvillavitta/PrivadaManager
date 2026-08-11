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
          <td style="padding:8px 0;border-bottom:1px solid #e8e4e6;color:#3f2a3c;">${escapeHtml(l.label)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e8e4e6;text-align:right;font-weight:600;color:#3f2a3c;">${money(l.amount)}</td>
        </tr>`,
    )
    .join("");

  const linesText = p.lines
    .map((l) => `  - ${l.label}: ${money(l.amount)}`)
    .join("\n");

  const subject = `Comprobante de pago · Casa ${p.houseNumber} · ${p.periodLabel}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f3f4;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#3f2a3c;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4e6;">
    <div style="background:#0a1628;padding:20px 24px;text-align:center;">
      <p style="margin:0;color:#7ddea0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Privada Manager</p>
      <p style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;">Comprobante de pago</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;">Hola <strong>${escapeHtml(p.residentName)}</strong>,</p>
      <p style="margin:0 0 20px;line-height:1.5;color:#6b5a68;">
        Confirmamos el registro de tu pago en <strong>${escapeHtml(p.privadaName)}</strong>.
        Conserva este correo como comprobante.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;">
        <tr>
          <td style="padding:6px 0;color:#6b5a68;">Casa</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(p.houseNumber)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b5a68;">Periodo</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(p.periodLabel)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b5a68;">Fecha de registro</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(formatPaidAt(p.paidAt))}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #0a1628;color:#0a1628;">Concepto</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #0a1628;color:#0a1628;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
        <tfoot>
          <tr>
            <td style="padding:12px 0 0;font-weight:700;font-size:16px;">Total</td>
            <td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;color:#1a7a45;">${money(p.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a7a86;">
        Este comprobante fue generado automáticamente por Privada Manager.
        ${p.privadaEmail || p.privadaPhone ? `Dudas: ${[p.privadaEmail, p.privadaPhone].filter(Boolean).join(" · ")}.` : ""}
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Comprobante de pago — ${p.privadaName}`,
    ``,
    `Hola ${p.residentName},`,
    ``,
    `Confirmamos el registro de tu pago. Conserva este correo como comprobante.`,
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
    `— Privada Manager`,
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
