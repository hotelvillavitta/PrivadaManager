import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

function gmailUser() {
  return process.env.GMAIL_USER?.trim() || "";
}

function gmailAppPassword() {
  // Google muestra la app password con espacios; los quitamos.
  return (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
}

function getFrom() {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;
  const gmail = gmailUser();
  if (gmail) return `Comité ${process.env.PRIVADA_EMAIL_NAME?.trim() || "Grenaché"} <${gmail}>`;
  return "Privada Manager <onboarding@resend.dev>";
}

export function isEmailConfigured() {
  return Boolean(
    (gmailUser() && gmailAppPassword()) || process.env.RESEND_API_KEY?.trim(),
  );
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<
  { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }
> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const recipients = to.map((e) => e.trim()).filter(Boolean);
  if (!recipients.length) {
    return { ok: false, error: "Sin destinatarios" };
  }

  const replyTo =
    opts.replyTo?.trim() || process.env.EMAIL_REPLY_TO?.trim() || undefined;

  // Preferir Gmail del comité si está configurado (sin dominio extra).
  if (gmailUser() && gmailAppPassword()) {
    return sendViaGmail({
      to: recipients,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo,
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    return sendViaResend({
      apiKey,
      to: recipients,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo,
    });
  }

  console.warn(
    "[email] Configura GMAIL_USER + GMAIL_APP_PASSWORD (o RESEND_API_KEY); se omite el envío.",
  );
  return { ok: false, skipped: true, error: "Email no configurado" };
}

async function sendViaGmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<
  { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }
> {
  try {
    const user = gmailUser();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: gmailAppPassword(),
      },
    });

    const headers: Record<string, string> = {
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    };
    if (opts.replyTo) {
      headers["List-Unsubscribe"] =
        `<mailto:${opts.replyTo}?subject=Consulta%20cuotas>`;
    }

    const info = await transporter.sendMail({
      from: getFrom(),
      to: opts.to.join(", "),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });

    return { ok: true, id: info.messageId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al enviar con Gmail";
    console.error("[email:gmail]", message);
    return { ok: false, error: message };
  }
}

async function sendViaResend(opts: {
  apiKey: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<
  { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }
> {
  try {
    const resend = new Resend(opts.apiKey);
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });

    if (error) {
      console.error("[email:resend]", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al enviar con Resend";
    console.error("[email:resend]", message);
    return { ok: false, error: message };
  }
}
