import "server-only";
import { sendEmail } from "@/lib/notify/email";
import { escapeHtml, renderEmailShell } from "@/lib/notify/email-layout";
import type { NotifyResult } from "@/lib/notify/channels";
import { FEE_GRACE_DAYS } from "@/lib/utils";

export type FineNoticePayload = {
  residentName: string;
  residentEmail: string;
  houseNumber: string;
  category: string;
  cause: string;
  regulationArticle: string;
  regulationExcerpt: string;
  amount: number;
  notes?: string | null;
  issuedAt: Date;
  /** Ej. "Agosto26" — cuota a la que se suma la multa. */
  billingPeriodLabel: string;
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

function formatIssuedAt(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Tijuana",
  }).format(d);
}

function excerptToHtml(excerpt: string) {
  return escapeHtml(excerpt)
    .split(/\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.55;color:#2a1c28;">${p}</p>`,
    )
    .join("");
}

export function buildFineNoticeEmail(p: FineNoticePayload) {
  const subject = `${p.privadaName}: multa aplicada · Casa ${p.houseNumber}`;
  const contactBits = [p.privadaEmail, p.privadaPhone].filter(Boolean);

  const html = renderEmailShell({
    privadaName: p.privadaName,
    eyebrow: "Notificación de multa / sanción",
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
        El comité aplicó una multa con base en el Reglamento Interno del Condominio Grenaché (REV 04, junio 2026). El monto se sumará a tu cuota de mantenimiento de <strong>${escapeHtml(p.billingPeriodLabel)}</strong>.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;width:40%;">Casa</td>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.houseNumber)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Categoría</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.category)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Monto</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#8b2e3b;font-weight:700;text-align:right;">${money(p.amount)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Se cobra con cuota</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.billingPeriodLabel)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Fecha</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2a1c28;font-weight:600;text-align:right;">${escapeHtml(formatIssuedAt(p.issuedAt))}</td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;font-weight:700;">
        Falta
      </p>
      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;font-weight:600;">
        ${escapeHtml(p.cause)}
      </p>

      ${
        p.notes
          ? `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5a4a57;"><strong>Notas del comité:</strong> ${escapeHtml(p.notes)}</p>`
          : ""
      }

      <div style="border:1px solid #e8dfd6;border-radius:12px;overflow:hidden;margin-bottom:18px;">
        <div style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;font-weight:700;">
          Fundamento · ${escapeHtml(p.regulationArticle)}
        </div>
        <div style="padding:16px;">
          ${excerptToHtml(p.regulationExcerpt)}
        </div>
      </div>

      <p style="margin:0;padding:14px 16px;background:#fdf2f2;border:1px solid #f0c9cd;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#8b2e3b;">
        <strong>Importante:</strong> Esta multa económica se incorporará a la cuota de mantenimiento de <strong>${escapeHtml(p.billingPeriodLabel)}</strong> (periodo de cobro: primeros ${FEE_GRACE_DAYS} días del mes).
      </p>
    `,
  });

  const text = [
    `${p.privadaName} — Notificación de multa / sanción`,
    ``,
    `Hola ${p.residentName},`,
    ``,
    `El comité aplicó una multa con base en el Reglamento Interno del Condominio Grenaché (REV 04, junio 2026). El monto se sumará a tu cuota de mantenimiento de ${p.billingPeriodLabel}.`,
    ``,
    `Casa: ${p.houseNumber}`,
    `Categoría: ${p.category}`,
    `Falta: ${p.cause}`,
    `Monto: ${money(p.amount)}`,
    `Se cobra con cuota: ${p.billingPeriodLabel}`,
    `Fecha: ${formatIssuedAt(p.issuedAt)}`,
    p.notes ? `Notas: ${p.notes}` : null,
    ``,
    `Fundamento · ${p.regulationArticle}`,
    p.regulationExcerpt,
    ``,
    `Importante: Esta multa se incorpora a la cuota de mantenimiento de ${p.billingPeriodLabel}.`,
    ``,
    [p.privadaName, p.privadaAddress, ...contactBits].filter(Boolean).join(" · "),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}

/** Envía aviso de multa por correo. No lanza: falla en soft. */
export async function sendFineNoticeEmail(
  payload: FineNoticePayload,
): Promise<NotifyResult> {
  const { subject, html, text } = buildFineNoticeEmail(payload);
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
