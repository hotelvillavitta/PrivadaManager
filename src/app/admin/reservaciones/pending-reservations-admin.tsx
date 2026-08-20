"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "@/components/Toast";
import { updateReservationStatus } from "@/lib/actions/portal";

type Item = {
  id: string;
  date: string;
  eventName: string;
  guests: number;
  notes: string | null;
  user: {
    firstName: string;
    lastName: string;
    houseNumber: string | null;
  };
};

export function PendingReservationsAdmin({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (items.length === 0) {
    return <p className="text-sm text-muted">No hay solicitudes pendientes.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li
          key={r.id}
          className="rounded-xl bg-background px-4 py-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-primary-dark">{r.eventName}</p>
              <p className="text-sm text-muted">
                {r.date} · {r.user.firstName} {r.user.lastName}
                {r.user.houseNumber ? ` · Casa ${r.user.houseNumber}` : ""} ·{" "}
                {r.guests} personas
              </p>
              {r.notes ? (
                <p className="mt-1 text-xs text-muted">Notas: {r.notes}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await updateReservationStatus(r.id, "APPROVED");
                    toast("Reservación aprobada.");
                    router.refresh();
                  });
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                Aprobar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setRejectingId(r.id);
                  setReason("");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger"
              >
                <X className="h-3.5 w-3.5" />
                Rechazar
              </button>
            </div>
          </div>
          {rejectingId === r.id ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo del rechazo"
                rows={2}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || !reason.trim()}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await updateReservationStatus(
                        r.id,
                        "REJECTED",
                        reason.trim(),
                      );
                      if (res?.error) {
                        toast(res.error, "error");
                        return;
                      }
                      toast("Reservación rechazada.");
                      setRejectingId(null);
                      router.refresh();
                    });
                  }}
                  className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Confirmar rechazo
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
