import "server-only";
import { sendEmail } from "@/lib/notify/email";
import { escapeHtml, renderEmailShell } from "@/lib/notify/email-layout";
import { DEBT_NOTICE_CONSEQUENCES } from "@/lib/fees/debt-notice-shared";
import type { NotifyResult } from "@/lib/notify/channels";
import { formatCurrency } from "@/lib/utils";

export type DebtNoticeEmailLine = {
  label: string;
  amount: number;
};

export type DebtNoticeEmailPayload = {
  residentName: string;
  residentEmail: string;
  houseNumber: string;
  months: number;
  lines: DebtNoticeEmailLine[];
  total: number;
  issuedOnLabel: string;
  privadaName: string;
  privadaAddress?: string | null;
  privadaEmail?: string | null;
  privadaPhone?: string | null;
};

function monthsLabel(months: number) {
  return months === 1 ? "1 mes" : `${months} meses`;
}

export function buildDebtNoticeEmail(p: DebtNoticeEmailPayload) {
  const subject = `${p.privadaName}: aviso de adeudo · Casa ${p.houseNumber}`;
  const contactBits = [p.privadaEmail, p.privadaPhone].filter(Boolean);
  const period = monthsLabel(p.months);
  const rows = p.lines
    .map(
      (line) => `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;">${escapeHtml(line.label)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;text-align:right;white-space:nowrap;">${formatCurrency(line.amount)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8b3a3a;font-weight:700;text-align:right;">Pendiente</td>
      </tr>`,
    )
    .join("");
  const consequences = DEBT_NOTICE_CONSEQUENCES.map(
    (item) =>
      `<tr><td style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#2a1c28;">• ${escapeHtml(item)}</td></tr>`,
  ).join("");
  const hello = p.residentName.trim()
    ? `Hola <strong>${escapeHtml(p.residentName)}</strong>,`
    : `Estimado(a) residente de la Casa ${escapeHtml(p.houseNumber)}:`;

  const html = renderEmailShell({
    privadaName: p.privadaName,
    eyebrow: "Aviso de adeudo",
    title: subject,
    footer: {
      address: p.privadaAddress,
      email: p.privadaEmail,
      phone: p.privadaPhone,
    },
    inner: `
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        ${hello}
      </p>
      <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        El comité registra un adeudo de ${period} en las cuotas de mantenimiento de la Casa ${escapeHtml(p.houseNumber)}. Conserva este correo como aviso oficial.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;margin-bottom:12px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;width:46%;">Casa</td>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${escapeHtml(p.houseNumber)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Meses pendientes</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a1c28;font-weight:700;text-align:right;">${period}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a4a57;">Fecha del aviso</td>
          <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2a1c28;font-weight:600;text-align:right;">${escapeHtml(p.issuedOnLabel)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe4ec;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4f334a;font-weight:700;">Adeudo total</td>
          <td style="padding:14px 16px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#8b3a3a;font-weight:700;text-align:right;">${formatCurrency(p.total)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8dfd6;border-radius:12px;overflow:hidden;margin-bottom:22px;">
        <tr>
          <th align="left" style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;">Mes</th>
          <th align="right" style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;">Monto</th>
          <th align="right" style="background:#efe4ec;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4f334a;">Estado</th>
        </tr>
        ${rows}
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2a1c28;font-weight:700;background:#f8f4ef;">Total</td>
          <td colspan="2" style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#8b3a3a;font-weight:700;text-align:right;background:#f8f4ef;">${formatCurrency(p.total)}</td>
        </tr>
      </table>

      <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#4f334a;font-weight:700;">
        Consecuencias por falta de pago
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 16px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${consequences}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#5a4a57;">
        Para ponerse al corriente, responde a este correo o contacta al tesorero o al Comité Vecinal. Tu cooperación mantiene la privada.
      </p>
    `,
  });

  const text = [
    `${p.privadaName} — Aviso de adeudo de cuotas de mantenimiento`,
    p.issuedOnLabel,
    ``,
    `Casa #${p.houseNumber}`,
    `Adeudo total: ${formatCurrency(p.total)}`,
    ``,
    p.residentName.trim()
      ? `Hola ${p.residentName},`
      : `Estimado(a) residente de la Casa ${p.houseNumber}:`,
    ``,
    `El comité registra un adeudo de ${period} en las cuotas de mantenimiento de la Casa ${p.houseNumber}. Conserva este correo como aviso oficial.`,
    ``,
    ...p.lines.map(
      (line) => `${line.label}  ${formatCurrency(line.amount)}  Pendiente`,
    ),
    ``,
    `Consecuencias por falta de pago:`,
    ...DEBT_NOTICE_CONSEQUENCES.map((item) => `- ${item}`),
    ``,
    `Para ponerse al corriente, responde a este correo o contacta al tesorero o al Comité Vecinal.`,
    ``,
    `Comité Vecinal`,
    [p.privadaName, p.privadaAddress, ...contactBits].filter(Boolean).join(" · "),
  ].join("\n");

  return { subject, html, text };
}

export async function sendDebtNoticeEmail(
  payload: DebtNoticeEmailPayload,
): Promise<NotifyResult> {
  const { subject, html, text } = buildDebtNoticeEmail(payload);
  const result = await sendEmail({
    to: payload.residentEmail,
    subject,
    html,
    text,
    replyTo: payload.privadaEmail ?? undefined,
  });
  if (result.ok) return { channel: "email", ok: true };
  return {
    channel: "email",
    ok: false,
    skipped: "skipped" in result ? result.skipped : false,
    error: result.error,
  };
}
