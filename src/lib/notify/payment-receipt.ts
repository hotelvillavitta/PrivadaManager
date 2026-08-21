import "server-only";
import { sendEmail } from "@/lib/notify/email";
import { escapeHtml, renderEmailShell } from "@/lib/notify/email-layout";
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
          <td style="padding:12px 16px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;">${escapeHtml(l.label)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;text-align:right;white-space:nowrap;">${money(l.amount)}</td>
        </tr>`,
    )
    .join("");

  const linesText = p.lines
    .map((l) => `  - ${l.label}: ${money(l.amount)}`)
    .join("\n");

  const subject = `${p.privadaName}: cuota registrada · Casa ${p.houseNumber} (${p.periodLabel})`;
  const contactBits = [p.privadaEmail, p.privadaPhone].filter(Boolean);

  const html = renderEmailShell({
    privadaName: p.privadaName,
    eyebrow: "Comprobante de pago",
    title: subject,
    footer: {
      address: p.privadaAddress,
      email: p.privadaEmail,
      phone: p.privadaPhone,
    },
    inner: `
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        Hola <strong>${escapeHtml(p.residentName)}</strong>,
      </p>
      <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        El comité registró tu pago de cuota. Conserva este correo como comprobante oficial.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;width:40%;">Casa</td>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.houseNumber)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Periodo</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.periodLabel)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Fecha de registro</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2a1c28;font-weight:600;text-align:right;">${escapeHtml(formatPaidAt(p.paidAt))}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8dfd6;border-radius:12px;overflow:hidden;margin-bottom:8px;">
        <tr>
          <th align="left" style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;">Concepto</th>
          <th align="right" style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;">Monto</th>
        </tr>
        ${linesHtml}
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2a1c28;font-weight:700;background:#f8f4ef;">Total</td>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1f6b4a;font-weight:700;text-align:right;background:#f8f4ef;">${money(p.total)}</td>
        </tr>
      </table>

      <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5a4a57;">
        Si no reconoces este movimiento, responde a este correo para contactar al comité.
      </p>
    `,
  });

  const text = [
    `${p.privadaName} — Comprobante de pago`,
    ``,
    `Hola ${p.residentName},`,
    ``,
    `El comité registró tu pago de cuota. Conserva este correo como comprobante oficial.`,
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
    [p.privadaName, p.privadaAddress, ...contactBits].filter(Boolean).join(" · "),
  ].join("\n");

  return { subject, html, text };
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload: PaymentReceiptPayload,
): Promise<NotifyResult> {
  return {
    channel: "whatsapp",
    ok: false,
    skipped: true,
    error: "WhatsApp aún no está habilitado",
  };
}
