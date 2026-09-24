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
  const subject = `${opts.privadaName}: tu acceso a la app`;
  const html = renderEmailShell({
    privadaName: opts.privadaName,
    eyebrow: "Acceso a la app",
    title: subject,
    inner: `
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2a1c28;">
        Hola ${escapeHtml(opts.name)},
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5a4a57;">
        El comité te dio acceso a la app de tu privada. Tienes <strong>dos opciones</strong> (elige solo una):
      </p>
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#4f334a;">
        Opción 1 — Usar esta contraseña temporal
      </p>
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5a4a57;">
        Entra a la app con tu correo y la contraseña de abajo. Luego puedes cambiarla cuando quieras.
      </p>
      <p style="margin:0 0 20px;padding:14px 16px;background:#f8f4ef;border:1px solid #e8dfd6;border-radius:12px;font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:0.08em;color:#4f334a;font-weight:700;text-align:center;">
        ${escapeHtml(opts.password)}
      </p>
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#4f334a;">
        Opción 2 — Elegir tu propia contraseña ahora
      </p>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5a4a57;">
        Si prefieres no usar la temporal, define la tuya con este botón (el enlace es válido 24 horas). No hace falta usar la contraseña de arriba.
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
    text: `Hola ${opts.name}. Acceso a la app — dos opciones:\n\n1) Usar la contraseña temporal: ${opts.password}\n2) Elegir la tuya ahora (válido 24 h): ${opts.resetUrl}\n\nNo hace falta hacer las dos.`,
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
        Recibimos una solicitud para cambiar la contraseña de tu app. El enlace caduca en 24 horas.
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
