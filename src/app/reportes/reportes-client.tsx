"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ClipboardList,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import { createIssueReport } from "@/lib/actions/portal";
import { uploadFilesFromClient } from "@/lib/client-upload";
import {
  ISSUE_CATEGORIES,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_STYLE,
} from "@/lib/issues/catalog";

type Photo = { id: string; url: string; name: string | null };
type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  status: "ABIERTO" | "EN_REVISION" | "RESUELTO" | "CERRADO";
  houseNumber: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  photos: Photo[];
};

export function ReportesClient({
  reports,
  houseNumber,
  uploadsReady,
}: {
  reports: Report[];
  houseNumber: string | null;
  uploadsReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(ISSUE_CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [filter, setFilter] = useState<"todos" | "abiertos" | "cerrados">(
    "todos",
  );
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [uploadHint, setUploadHint] = useState("");

  const filtered = useMemo(() => {
    if (filter === "abiertos") {
      return reports.filter(
        (r) => r.status === "ABIERTO" || r.status === "EN_REVISION",
      );
    }
    if (filter === "cerrados") {
      return reports.filter(
        (r) => r.status === "RESUELTO" || r.status === "CERRADO",
      );
    }
    return reports;
  }, [filter, reports]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory(ISSUE_CATEGORIES[0]);
    setLocation("");
    setPhotos(null);
    setUploadHint("");
    setShowForm(false);
  }

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Comunidad"
        title="Reportes de desperfectos"
        description="Avisa al comité sobre daños en áreas comunes, portón, iluminación u otros. Incluye fotos para agilizar la atención."
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 lg:px-6">
        {!uploadsReady && (
          <div className="rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
            Las fotos aún no están disponibles en este entorno. El comité debe
            configurar Vercel Blob.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(
              [
                ["todos", "Todos"],
                ["abiertos", "Abiertos"],
                ["cerrados", "Cerrados"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === key
                    ? "bg-primary text-white"
                    : "bg-surface text-muted ring-1 ring-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!uploadsReady}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo reporte
          </button>
        </div>

        {showForm && (
          <form
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              startTransition(async () => {
                try {
                  const list = photos ? Array.from(photos).slice(0, 4) : [];
                  if (list.length === 0) {
                    toast("Agrega al menos una foto.", "error");
                    return;
                  }
                  setUploadHint("Subiendo fotos…");
                  const uploaded = await uploadFilesFromClient(list, {
                    folder: "reports",
                    kind: "image",
                  });
                  fd.delete("photos");
                  fd.set("photoUrls", JSON.stringify(uploaded));
                  setUploadHint("Guardando reporte…");
                  const res = await createIssueReport(fd);
                  if (res.error) {
                    toast(res.error, "error");
                    setUploadHint("");
                    return;
                  }
                  toast("Reporte enviado al comité.");
                  resetForm();
                  router.refresh();
                } catch (err) {
                  toast(
                    err instanceof Error
                      ? err.message
                      : "No se pudieron subir las fotos. Intenta con JPG más liviano.",
                    "error",
                  );
                  setUploadHint("");
                }
              });
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl text-primary-dark">
                Nuevo reporte
              </h3>
              <button type="button" onClick={resetForm} className="text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            {houseNumber && (
              <p className="mb-3 text-xs text-muted">
                Se registrará a nombre de la casa #{houseNumber}.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título breve"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2"
              />
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ubicación (opcional)"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>
            <textarea
              name="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el desperfecto con el mayor detalle posible"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
            <label className="mt-3 block text-sm text-muted">
              <span className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                Fotos (1 a 4 · obligatorias)
              </span>
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                multiple
                required
                onChange={(e) => setPhotos(e.target.files)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
              <span className="mt-1 block text-xs">
                En el teléfono se comprimen automáticamente. Preferible JPG/PNG.
              </span>
            </label>
            {uploadHint ? (
              <p className="mt-2 text-xs font-medium text-primary">{uploadHint}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Enviar reporte"}
            </button>
          </form>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-10 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-border" />
            <p className="mt-3 text-sm text-muted">
              Aún no hay reportes en esta vista.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary-dark">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {r.category}
                      {r.location ? ` · ${r.location}` : ""}
                      {" · "}
                      {new Date(r.createdAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ISSUE_STATUS_STYLE[r.status]}`}
                  >
                    {ISSUE_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {r.description}
                </p>
                {r.location && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5" /> {r.location}
                  </p>
                )}
                {r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {r.photos.map((p) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={p.name ?? "Evidencia"}
                          className="h-20 w-20 rounded-xl object-cover ring-1 ring-border"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {r.adminNotes && (
                  <p className="mt-3 rounded-xl bg-primary-soft/50 px-3 py-2 text-sm text-primary-dark">
                    <span className="font-semibold">Comité:</span> {r.adminNotes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
