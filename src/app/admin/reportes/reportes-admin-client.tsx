"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { toast } from "@/components/Toast";
import { AdminFormSheet } from "@/components/AdminFormSheet";
import { updateIssueReport } from "@/lib/actions/portal";
import {
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
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    houseNumber: string | null;
    email: string;
  };
};

export function ReportesAdminClient({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"abiertos" | "todos" | "cerrados">(
    "abiertos",
  );
  const [editing, setEditing] = useState<Report | null>(null);
  const [status, setStatus] = useState<Report["status"]>("ABIERTO");
  const [adminNotes, setAdminNotes] = useState("");

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

  function openEdit(r: Report) {
    setEditing(r);
    setStatus(r.status);
    setAdminNotes(r.adminNotes ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["abiertos", "Abiertos"],
            ["todos", "Todos"],
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
                : "bg-background text-muted ring-1 ring-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          No hay reportes en esta vista.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {filtered.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-primary-dark">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Casa {r.houseNumber ?? r.reporter.houseNumber ?? "—"} ·{" "}
                    {r.reporter.firstName} {r.reporter.lastName} · {r.category}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ISSUE_STATUS_STYLE[r.status]}`}
                >
                  {ISSUE_STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{r.description}</p>
              {r.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5" /> {r.location}
                </p>
              )}
              {r.photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
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
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
                      />
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted">
                  {new Date(r.createdAt).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Gestionar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminFormSheet open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && (
          <form
            action={(fd) => {
              startTransition(async () => {
                const res = await updateIssueReport(fd);
                if (res.error) {
                  toast(res.error, "error");
                  return;
                }
                toast("Reporte actualizado.");
                setEditing(null);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="id" value={editing.id} />
            <h3 className="font-display text-xl text-primary-dark">
              Gestionar reporte
            </h3>
            <p className="mt-1 text-sm text-muted">{editing.title}</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block font-medium text-primary-dark">
                Estado
              </span>
              <select
                name="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Report["status"])
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {(
                  Object.keys(ISSUE_STATUS_LABEL) as Array<
                    keyof typeof ISSUE_STATUS_LABEL
                  >
                ).map((key) => (
                  <option key={key} value={key}>
                    {ISSUE_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium text-primary-dark">
                Notas para el residente (opcional)
              </span>
              <textarea
                name="adminNotes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ej. Ya se programó la reparación para el viernes."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        )}
      </AdminFormSheet>
    </div>
  );
}
