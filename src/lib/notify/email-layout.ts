import "server-only";
import { readFile } from "fs/promises";
import path from "path";

export const EMAIL_LOGO_CID = "grenache-logo";

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** src del logo embebido en el correo (CID). */
export function emailBrandLogoSrc() {
  return `cid:${EMAIL_LOGO_CID}`;
}

let logoBufferPromise: Promise<Buffer> | null = null;

export async function getEmailLogoBuffer() {
  if (!logoBufferPromise) {
    logoBufferPromise = readFile(
      path.join(process.cwd(), "public/brand/grenache-logo.png"),
    );
  }
  return logoBufferPromise;
}

type EmailShellOpts = {
  privadaName: string;
  /** Línea corta bajo el nombre, p. ej. "Comprobante de pago". */
  eyebrow?: string;
  title?: string;
  inner: string;
  footer?: {
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

/**
 * Cabecera con sello circular + nombre (sin banner rígido),
 * cuerpo y pie suaves con el mismo sello pequeño.
 * El logo va embebido vía CID (no depende de URL externa / bloqueo de Gmail).
 */
export function renderEmailShell(opts: EmailShellOpts) {
  const logo = emailBrandLogoSrc();
  const name = escapeHtml(opts.privadaName);
  const eyebrow = opts.eyebrow ? escapeHtml(opts.eyebrow) : null;
  const title = opts.title ? escapeHtml(opts.title) : "Grenache";
  const contactBits = [opts.footer?.email, opts.footer?.phone].filter(Boolean);
  const address = opts.footer?.address?.trim();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4efe8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e0d5cb;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;background:#faf6f1;border-bottom:1px solid #efe6dc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="64" valign="middle" style="padding-right:14px;">
                    <img
                      src="${logo}"
                      width="56"
                      height="56"
                      alt="${name}"
                      style="display:block;width:56px;height:56px;border:0;border-radius:50%;background:#ffffff;outline:1px solid #e8dfd6;"
                    />
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.15;color:#4f334a;font-weight:700;">
                      ${name}
                    </p>
                    <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.04em;color:#8a7a86;">
                      App Residencial
                    </p>
                    ${
                      eyebrow
                        ? `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#b08a5a;font-weight:700;">${eyebrow}</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${opts.inner}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #efe6dc;background:#faf7f3;padding:18px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="top" style="padding-right:12px;">
                    <img
                      src="${logo}"
                      width="32"
                      height="32"
                      alt=""
                      style="display:block;width:32px;height:32px;border:0;border-radius:50%;background:#ffffff;outline:1px solid #e8dfd6;"
                    />
                  </td>
                  <td valign="top">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#4f334a;font-weight:700;">
                      ${name}
                    </p>
                    ${
                      address
                        ? `<p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#5a4a57;">${escapeHtml(address)}</p>`
                        : ""
                    }
                    ${
                      contactBits.length
                        ? `<p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5a4a57;">${escapeHtml(contactBits.join(" · "))}</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a7a86;">
          Correo del portal residencial · ${name}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
