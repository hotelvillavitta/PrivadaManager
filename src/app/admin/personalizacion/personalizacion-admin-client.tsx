"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, QrCode } from "lucide-react";
import { toast } from "@/components/Toast";
import { updatePrivadaBranding } from "@/lib/actions/portal";
import type { Privada } from "@/lib/privada";
import { DEFAULT_PRIVADA } from "@/lib/privada";

export function PersonalizacionAdminClient({
  privada,
  origin,
}: {
  privada: Privada;
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(privada.name);
  const [tagline, setTagline] = useState(privada.tagline);
  const [primaryColor, setPrimaryColor] = useState(privada.primaryColor);
  const [slug, setSlug] = useState(privada.slug ?? "grenache");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(
    privada.logoUrl,
  );

  const shareUrl = useMemo(() => {
    const base = origin.replace(/\/$/, "");
    return `${base}/login?privada=${encodeURIComponent(slug || "grenache")}`;
  }, [origin, slug]);

  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`,
    [shareUrl],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <form
        className="space-y-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
        action={(fd) => {
          startTransition(async () => {
            const res = await updatePrivadaBranding(fd);
            if (res.error) toast(res.error, "error");
            else {
              toast("Personalización guardada.");
              setRemoveLogo(false);
              router.refresh();
            }
          });
        }}
      >
        <div>
          <h2 className="font-display text-2xl text-primary-dark">
            Identidad de la privada
          </h2>
          <p className="mt-1 text-sm text-muted">
            Estos cambios aplican a botones, logo y nombre del portal.
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-primary-dark">
            Nombre de la privada
          </span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-primary-dark">
            Lema / descripción corta
          </span>
          <textarea
            name="tagline"
            rows={2}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-primary-dark">Logo</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewLogo || "/brand/grenache-logo.png"}
                alt="Vista previa del logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRemoveLogo(false);
                  setPreviewLogo(URL.createObjectURL(file));
                }}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
              <p className="text-xs text-muted">
                PNG o JPG, máximo 5 MB. Recomendado cuadrado.
              </p>
              {privada.logoUrl && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    name="removeLogo"
                    checked={removeLogo}
                    onChange={(e) => {
                      setRemoveLogo(e.target.checked);
                      if (e.target.checked) setPreviewLogo(null);
                      else setPreviewLogo(privada.logoUrl);
                    }}
                  />
                  Quitar logo personalizado
                </label>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-primary-dark">
            Color principal
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              aria-label="Color principal"
            />
            <input
              name="primaryColor"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="button"
              onClick={() => setPrimaryColor(DEFAULT_PRIVADA.primaryColor)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Restablecer
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Se aplica a botones, enlaces y acentos visuales.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: primaryColor }}
            >
              Botón principal
            </span>
            <span
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: `${primaryColor}22`,
                color: primaryColor,
              }}
            >
              Acento suave
            </span>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-primary-dark">
            Slug del enlace
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <aside className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">
          Enlace personalizado
        </p>
        <p className="mt-2 text-sm text-muted">
          Comparte este enlace con los residentes. Verán el nombre y color de tu
          privada al iniciar sesión.
        </p>
        <p className="mt-3 break-all rounded-xl bg-background px-3 py-2 font-mono text-xs text-primary-dark">
          {shareUrl}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                toast("Enlace copiado.");
              } catch {
                toast("No se pudo copiar el enlace.", "error");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary-dark"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar enlace
          </button>
          <a
            href={qrUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary-dark"
          >
            <QrCode className="h-3.5 w-3.5" /> Generar QR
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="Código QR del enlace"
          className="mt-4 h-40 w-40 rounded-xl border border-border bg-white p-2"
        />
        <p className="mt-4 font-display text-2xl text-primary-dark">{name}</p>
        <p className="text-sm text-muted">{tagline}</p>
      </aside>
    </div>
  );
}
