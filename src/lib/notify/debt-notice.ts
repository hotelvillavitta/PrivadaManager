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
        <td style="padding:10px 14px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2a1c28;">${escapeHtml(line.label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2a1c28;text-align:right;white-space:nowrap;">${formatCurrency(line.amount)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8dfd6;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8b3a3a;font-weight:700;text-align:right;">Pendiente</td>
      </tr>`,
    )
    .join("");
  const consequences = DEBT_NOTICE_CONSEQUENCES.map(
    (item) =>
      `<li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#2a1c28;">${escapeHtml(item)}</li>`,
  ).join("");

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
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7a86;">
        ${escapeHtml(p.issuedOnLabel)}
      </p>
      <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:#4f334a;font-weight:700;">
        Aviso de adeudo de cuotas de mantenimiento
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2a1c28;font-weight:700;">Casa #${escapeHtml(p.houseNumber)}</td>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#8b3a3a;font-weight:700;text-align:right;">Adeudo total: ${formatCurrency(p.total)}</td>
        </tr>
      </table>
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        Estimado(a) residente de la Casa #${escapeHtml(p.houseNumber)}:
      </p>
      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        Por medio del presente, le informamos que su cuenta de cuotas de mantenimiento presenta un adeudo de ${period}. A continuación se detalla su historial:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8dfd6;border-radius:12px;overflow:hidden;margin-bottom:22px;">
        <tr>
          <th align="left" style="background:#4f334a;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">Mes</th>
          <th align="right" style="background:#4f334a;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">Monto</th>
          <th align="right" style="background:#4f334a;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">Estado</th>
        </tr>
        ${rows}
      </table>
      <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#4f334a;font-weight:700;">
        Consecuencias por falta de pago
      </p>
      <ul style="margin:0 0 18px;padding-left:18px;">
        ${consequences}
      </ul>
      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        Le invitamos a ponerse en contacto con el Tesorero o el Comité Vecinal para acordar un plan de regularización de pagos. Su cooperación es fundamental para el bienestar y mantenimiento de nuestra comunidad.
      </p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.4;color:#4f334a;">
        Comité Vecinal<br>${escapeHtml(p.privadaName)}
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
    `Estimado(a) residente de la Casa #${p.houseNumber}:`,
    ``,
    `Por medio del presente, le informamos que su cuenta de cuotas de mantenimiento presenta un adeudo de ${period}. A continuación se detalla su historial:`,
    ``,
    ...p.lines.map(
      (line) => `${line.label}  ${formatCurrency(line.amount)}  Pendiente`,
    ),
    ``,
    `Consecuencias por falta de pago:`,
    ...DEBT_NOTICE_CONSEQUENCES.map((item) => `- ${item}`),
    ``,
    `Le invitamos a ponerse en contacto con el Tesorero o el Comité Vecinal para acordar un plan de regularización de pagos.`,
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
