import "server-only";
import { sendEmail } from "@/lib/notify/email";
import { escapeHtml, renderEmailShell } from "@/lib/notify/email-layout";

export async function sendTemporaryPasswordEmail(opts: {
  to: string;
  name: string;
  privadaName: string;
  password: string;
  resetUrl: string;
}) {
  const subject = `${opts.privadaName}: tu acceso al portal`;
  const html = renderEmailShell({
    privadaName: opts.privadaName,
    eyebrow: "Acceso al portal",
    title: subject,
    inner: `
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        Hola ${escapeHtml(opts.name)},
      </p>
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        El comité generó una contraseña inicial para tu cuenta. Úsala para entrar y, cuando quieras, elige una propia con el enlace (válido 24 horas).
      </p>
      <p style="margin:16px 0;padding:14px 16px;background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:0.08em;color:#4f334a;font-weight:700;text-align:center;">
        ${escapeHtml(opts.password)}
      </p>
      <p style="margin:0 0 16px;text-align:center;">
        <a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#4f334a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">Elegir mi contraseña</a>
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#8a7a86;">
        Si no esperabas este correo, avisa al comité.
      </p>
    `,
  });
  return sendEmail({
    to: opts.to,
    subject,
    html,
    text: `Hola ${opts.name}. Contraseña inicial: ${opts.password}\nElige la tuya aquí: ${opts.resetUrl}`,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  privadaName: string;
  resetUrl: string;
}) {
  const subject = `${opts.privadaName}: cambia tu contraseña`;
  const html = renderEmailShell({
    privadaName: opts.privadaName,
    eyebrow: "Cambio de contraseña",
    title: subject,
    inner: `
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        Hola ${escapeHtml(opts.name)},
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        Recibimos una solicitud para cambiar la contraseña de tu portal. El enlace caduca en 24 horas.
      </p>
      <p style="margin:0 0 16px;text-align:center;">
        <a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#4f334a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">Cambiar contraseña</a>
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#8a7a86;">
        Si no fuiste tú, ignora este mensaje; tu acceso no cambia.
      </p>
    `,
  });
  return sendEmail({
    to: opts.to,
    subject,
    html,
    text: `Hola ${opts.name}. Cambia tu contraseña: ${opts.resetUrl}`,
  });
}
