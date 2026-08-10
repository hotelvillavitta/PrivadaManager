"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  createReservation,
  updateReservationStatus,
} from "@/lib/actions/portal";

type Reservation = {
  id: string;
  date: string;
  eventName: string;
  guests: number;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  userId: string;
  user: { firstName: string; lastName: string; houseNumber: string | null };
};

const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ReservacionesClient({
  reservations,
  isAdmin,
  currentUserId,
}: {
  reservations: Reservation[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"calendar" | "new">("calendar");
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    return toKey(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (r.status === "CANCELLED" || r.status === "REJECTED") continue;
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    }
    return map;
  }, [reservations]);

  function statusFor(dateKey: string) {
    const list = byDate.get(dateKey);
    if (!list?.length) return "available";
    if (list.some((r) => r.status === "APPROVED")) return "reserved";
    if (list.some((r) => r.status === "PENDING")) return "pending";
    return "available";
  }

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < start; i++) result.push({ day: null, key: null });
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ day: d, key: toKey(year, month, d) });
    }
    while (result.length % 7 !== 0) result.push({ day: null, key: null });
    return result;
  }, [year, month]);

  const weekCells = useMemo(() => {
    const base = new Date(selected + "T12:00:00");
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        day: d.getDate(),
        key: toKey(d.getFullYear(), d.getMonth(), d.getDate()),
      };
    });
  }, [selected]);

  const pendingList = reservations.filter((r) => r.status === "PENDING");

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Área común"
        title="Reservaciones Palapa"
        description="Reserva aquí la palapa para tus reuniones familiares y eventos especiales."
      />

      <div className="mx-auto mb-8 flex max-w-md justify-center rounded-full bg-border/60 p-1">
        <button
          type="button"
          onClick={() => setTab("calendar")}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            tab === "calendar"
              ? "bg-surface text-primary-dark shadow-sm"
              : "text-muted"
          }`}
        >
          Ver Calendario
        </button>
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            tab === "new"
              ? "bg-surface text-primary-dark shadow-sm"
              : "text-muted"
          }`}
        >
          Nueva Reservación
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              <h3 className="font-display text-lg text-primary-dark">
                Horarios
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <span className="font-medium text-foreground">Dom – Jue:</span>{" "}
                12:00 pm – 10:00 pm
              </li>
              <li>
                <span className="font-medium text-foreground">Vie – Sáb:</span>{" "}
                12:00 pm – 2:00 am
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <h3 className="font-display text-lg text-primary-dark">
                Capacidad
              </h3>
            </div>
            <p className="font-display text-3xl text-primary-dark">50 personas</p>
            <p className="mt-1 text-sm text-muted">
              Capacidad máxima del salón
            </p>
          </div>

          {isAdmin && pendingList.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
              <h3 className="mb-3 font-display text-lg text-primary-dark">
                Pendientes ({pendingList.length})
              </h3>
              <ul className="space-y-3">
                {pendingList.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl bg-surface/80 p-3 text-sm"
                  >
                    <p className="font-medium">{r.eventName}</p>
                    <p className="text-muted">
                      {r.date} · {r.user.firstName}{" "}
                      {r.user.houseNumber
                        ? `(Casa ${r.user.houseNumber})`
                        : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await updateReservationStatus(r.id, "APPROVED");
                            router.refresh();
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-success px-2 py-1 text-xs text-white"
                      >
                        <Check className="h-3 w-3" /> Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await updateReservationStatus(r.id, "REJECTED");
                            router.refresh();
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-danger px-2 py-1 text-xs text-white"
                      >
                        <X className="h-3 w-3" /> Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          {tab === "calendar" ? (
            <>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-display text-xl capitalize text-primary-dark">
                      {monthLabel}
                    </p>
                    <p className="text-sm text-muted">
                      Calendario de disponibilidad.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-full bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setView("month")}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        view === "month"
                          ? "bg-surface text-primary shadow-sm"
                          : "text-muted"
                      }`}
                    >
                      Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("week")}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        view === "week"
                          ? "bg-surface text-primary shadow-sm"
                          : "text-muted"
                      }`}
                    >
                      Semana
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-border p-2 hover:bg-background"
                    onClick={() => setCursor(new Date(year, month - 1, 1))}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                    onClick={() => {
                      const d = new Date();
                      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                      setSelected(
                        toKey(d.getFullYear(), d.getMonth(), d.getDate()),
                      );
                    }}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border p-2 hover:bg-background"
                    onClick={() => setCursor(new Date(year, month + 1, 1))}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
                {weekDays.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(view === "month" ? cells : weekCells).map((cell, idx) => {
                  if (!("key" in cell) || !cell.key || !cell.day) {
                    return <div key={`empty-${idx}`} className="min-h-16" />;
                  }
                  const status = statusFor(cell.key);
                  const isSelected = selected === cell.key;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelected(cell.key!);
                        if (status === "available") setTab("new");
                      }}
                      className={`min-h-16 rounded-xl border p-2 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : status === "reserved"
                            ? "border-danger/20 bg-danger-soft"
                            : status === "pending"
                              ? "border-warning/20 bg-warning-soft"
                              : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold">
                        {cell.day}
                      </span>
                      {status === "reserved" && !isSelected && (
                        <p className="mt-1 text-[10px] font-medium text-danger">
                          Reservado
                        </p>
                      )}
                      {status === "pending" && !isSelected && (
                        <p className="mt-1 text-[10px] font-medium text-warning">
                          Pendiente
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
                <Legend color="bg-[#f3c9cd]" label="Reservado" />
                <Legend color="bg-[#f0d9a0]" label="Pendiente" />
                <Legend color="bg-[#b7dfc8]" label="Disponible" />
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <h4 className="mb-3 font-display text-lg text-primary-dark">
                  Mis solicitudes
                </h4>
                <ul className="space-y-2 text-sm">
                  {reservations
                    .filter((r) => r.userId === currentUserId)
                    .map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-xl bg-background px-3 py-2"
                      >
                        <span>
                          {r.date} · {r.eventName}
                        </span>
                        <span className="text-xs font-semibold uppercase text-muted">
                          {r.status}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          ) : (
            <form
              className="mx-auto max-w-lg space-y-4"
              action={(fd) => {
                setMessage("");
                startTransition(async () => {
                  const res = await createReservation(fd);
                  if (res.error) setMessage(res.error);
                  else {
                    setMessage(
                      "Solicitud enviada. Queda pendiente de aprobación del comité.",
                    );
                    setTimeout(() => router.refresh(), 800);
                  }
                });
              }}
            >
              <h3 className="font-display text-2xl text-primary-dark">
                Nueva reservación
              </h3>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Fecha</span>
                <input
                  type="date"
                  name="date"
                  required
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Nombre del evento
                </span>
                <input
                  name="eventName"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Cumpleaños, reunión familiar…"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Número de invitados
                </span>
                <input
                  type="number"
                  name="guests"
                  min={1}
                  max={50}
                  required
                  defaultValue={20}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Notas</span>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Detalles adicionales"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                Solicitar reservación
              </button>
              {message && (
                <p
                  className={`rounded-xl px-3 py-2 text-sm ${
                    message.includes("enviada")
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
