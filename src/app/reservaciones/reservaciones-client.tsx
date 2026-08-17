"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Send,
  Users,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
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
  rejectionReason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  userId: string;
  user: { firstName: string; lastName: string; houseNumber: string | null };
};

const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const RULES = [
  "Las reservaciones deben solicitarse con al menos 1 semana de anticipación.",
  "Máximo 6 horas consecutivas de uso.",
  "El residente responsable debe estar presente durante todo el evento.",
  "Queda prohibido el uso de equipo de sonido después de las 22:00 hrs.",
  "El área debe dejarse en las mismas condiciones en que se encontró.",
];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function minReservationDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ReservacionesClient({
  reservations,
  isAdmin,
  currentUserId,
  houseNumber,
  hasPendingFees,
  focusReservationId,
}: {
  reservations: Reservation[];
  isAdmin: boolean;
  currentUserId: string;
  houseNumber: string | null;
  hasPendingFees: boolean;
  focusReservationId: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"calendar" | "new">(
    focusReservationId ? "calendar" : "calendar",
  );
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(todayKey);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [focusId, setFocusId] = useState<string | null>(focusReservationId);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const today = todayKey();
  const minBookable = minReservationDate();
  const bookingDate = selected >= minBookable ? selected : minBookable;

  function goToNewReservation(dateKey?: string) {
    const next = dateKey && dateKey >= minBookable ? dateKey : minBookable;
    setSelected(next);
    setTab("new");
  }

  useEffect(() => {
    setFocusId(focusReservationId);
    setRejecting(false);
    setRejectionReason("");
    if (focusReservationId) {
      const el = document.getElementById(`solicitud-${focusReservationId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusReservationId]);

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
  const monthAgenda = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    return reservations
      .filter(
        (r) =>
          r.date.startsWith(prefix) &&
          r.status !== "CANCELLED" &&
          r.status !== "REJECTED",
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.eventName.localeCompare(b.eventName, "es");
      });
  }, [reservations, year, month]);
  const focused = focusId
    ? reservations.find((r) => r.id === focusId) ?? null
    : null;
  const canSubmit = !hasPendingFees && !pending;

  function statusAgendaLabel(status: Reservation["status"]) {
    if (status === "APPROVED") return "Aprobada";
    if (status === "PENDING") return "Pendiente";
    if (status === "REJECTED") return "Rechazada";
    return "Cancelada";
  }

  function formatAgendaDay(dateKey: string) {
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Área común"
        title="Reservaciones Palapa"
        description="Reserva la palapa para reuniones familiares y eventos especiales."
      />

      <div className="mx-4 mb-6 flex max-w-md justify-center rounded-full bg-border/60 p-1 sm:mx-auto sm:mb-8">
        <button
          type="button"
          onClick={() => setTab("calendar")}
          className={`flex-1 rounded-full px-2 py-2.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
            tab === "calendar"
              ? "bg-surface text-primary-dark shadow-sm"
              : "text-muted"
          }`}
        >
          Ver Calendario
        </button>
        <button
          type="button"
          onClick={() => goToNewReservation(selected)}
          className={`flex-1 rounded-full px-2 py-2.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
            tab === "new"
              ? "bg-surface text-primary-dark shadow-sm"
              : "text-muted"
          }`}
        >
          Nueva Reservación
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="order-2 space-y-4 lg:order-1">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              <h3 className="font-display text-lg text-primary-dark">
                Horarios
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <span className="font-medium text-foreground">
                  Domingo a Jueves:
                </span>{" "}
                12:00 pm – 22:00 pm
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Viernes y Sábado:
                </span>{" "}
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

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <ListChecks className="h-5 w-5" />
              <h3 className="font-display text-lg text-primary-dark">
                Reglamento
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && pendingList.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
              <h3 className="mb-3 font-display text-lg text-primary-dark">
                Pendientes ({pendingList.length})
              </h3>
              <ul className="space-y-2 text-sm">
                {pendingList.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusId(r.id);
                        router.replace(`/reservaciones?solicitud=${r.id}`);
                      }}
                      className="w-full rounded-xl bg-surface/80 p-3 text-left hover:ring-1 hover:ring-primary/30"
                    >
                      <p className="font-medium">{r.eventName}</p>
                      <p className="text-muted">
                        {r.date}
                        {r.user.houseNumber
                          ? ` · Casa ${r.user.houseNumber}`
                          : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="order-1 space-y-4 lg:order-2">
          {focused && (
            <section
              id={`solicitud-${focused.id}`}
              className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-5 shadow-sm sm:p-6"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xl text-primary-dark">
                  Solicitud de palapa
                </h3>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {focused.status}
                </span>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Casa</dt>
                  <dd className="font-medium text-primary-dark">
                    {focused.user.houseNumber
                      ? `#${focused.user.houseNumber}`
                      : "Sin asignar"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Residente</dt>
                  <dd className="font-medium text-primary-dark">
                    {focused.user.firstName} {focused.user.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Fecha</dt>
                  <dd className="font-medium text-primary-dark">
                    {focused.date}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Invitados</dt>
                  <dd className="font-medium text-primary-dark">
                    {focused.guests} personas
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Motivo / evento</dt>
                  <dd className="font-medium text-primary-dark">
                    {focused.eventName}
                  </dd>
                </div>
                {focused.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Notas del residente</dt>
                    <dd className="text-foreground">{focused.notes}</dd>
                  </div>
                )}
                {focused.status === "REJECTED" && focused.rejectionReason && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Motivo del rechazo</dt>
                    <dd className="font-medium text-danger">
                      {focused.rejectionReason}
                    </dd>
                  </div>
                )}
              </dl>
              {isAdmin && focused.status === "PENDING" && (
                <div className="mt-4 space-y-3">
                  {!rejecting ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await updateReservationStatus(
                              focused.id,
                              "APPROVED",
                            );
                            toast("Reservación aprobada.");
                            setFocusId(null);
                            router.replace("/reservaciones");
                            router.refresh();
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Check className="h-4 w-4" /> Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setRejecting(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white"
                      >
                        <X className="h-4 w-4" /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-primary-dark">
                          Motivo del rechazo *
                        </span>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          required
                          placeholder="Ej. Fecha no disponible, incumple reglamento, etc."
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending || !rejectionReason.trim()}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await updateReservationStatus(
                                focused.id,
                                "REJECTED",
                                rejectionReason.trim(),
                              );
                              if (res?.error) {
                                toast(res.error, "error");
                                return;
                              }
                              toast("Reservación rechazada.");
                              setRejecting(false);
                              setRejectionReason("");
                              setFocusId(null);
                              router.replace("/reservaciones");
                              router.refresh();
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setRejecting(false);
                            setRejectionReason("");
                          }}
                          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-background"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-6">
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
                        setSelected(todayKey());
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
                    if (!cell.key || !cell.day) {
                      return <div key={`empty-${idx}`} className="min-h-12 sm:min-h-16" />;
                    }
                    const status = statusFor(cell.key);
                    const isSelected = selected === cell.key;
                    const isToday = cell.key === today;
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => {
                          setSelected(cell.key!);
                          if (
                            status === "available" &&
                            !hasPendingFees &&
                            cell.key! >= minBookable
                          ) {
                            goToNewReservation(cell.key!);
                          }
                        }}
                        className={`min-h-12 rounded-lg border p-0.5 text-center transition sm:min-h-16 sm:rounded-xl sm:p-2 sm:text-left ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : isToday
                              ? "border-primary bg-primary-soft ring-2 ring-primary/30"
                              : status === "reserved"
                                ? "border-danger/20 bg-danger-soft"
                                : status === "pending"
                                  ? "border-warning/20 bg-warning-soft"
                                  : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:text-sm">
                          {cell.day}
                        </span>
                        {isToday && !isSelected && (
                          <p className="mt-1 hidden text-[10px] font-medium text-primary sm:block">
                            Hoy
                          </p>
                        )}
                        {status === "reserved" && !isSelected && (
                          <p className="mt-1 hidden text-[10px] font-medium text-danger sm:block">
                            Reservado
                          </p>
                        )}
                        {status === "pending" && !isSelected && (
                          <p className="mt-1 hidden text-[10px] font-medium text-warning sm:block">
                            Pendiente
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5 text-[11px] text-muted sm:mt-5 sm:gap-4 sm:text-xs">
                  <Legend color="bg-[#f3c9cd]" label="Reservado" />
                  <Legend color="bg-[#f0d9a0]" label="Pendiente" />
                  <Legend color="bg-[#b7dfc8]" label="Disponible" />
                </div>

                {isAdmin && (
                  <div className="mt-6 border-t border-border pt-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h4 className="font-display text-lg text-primary-dark">
                          Agenda del mes
                        </h4>
                        <p className="text-sm capitalize text-muted">
                          {monthLabel} · {monthAgenda.length} reservación
                          {monthAgenda.length === 1 ? "" : "es"}
                        </p>
                      </div>
                    </div>
                    {monthAgenda.length === 0 ? (
                      <p className="rounded-xl bg-background px-4 py-3 text-sm text-muted">
                        No hay reservaciones en este mes.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {monthAgenda.map((r) => {
                          const isFocus = focusId === r.id;
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                id={`agenda-${r.id}`}
                                onClick={() => {
                                  setSelected(r.date);
                                  setFocusId(r.id);
                                  const el = document.getElementById(
                                    `solicitud-${r.id}`,
                                  );
                                  el?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                                }}
                                className={`flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                                  isFocus
                                    ? "border-primary bg-primary-soft/50"
                                    : "border-border bg-background hover:border-primary/30"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    {formatAgendaDay(r.date)}
                                  </p>
                                  <p className="truncate font-semibold text-primary-dark">
                                    {r.eventName}
                                  </p>
                                  <p className="text-sm text-muted">
                                    Casa {r.user.houseNumber ?? "—"} ·{" "}
                                    {r.user.firstName} {r.user.lastName} ·{" "}
                                    {r.guests} personas
                                  </p>
                                </div>
                                <span
                                  className={`self-start rounded-full px-2.5 py-1 text-[11px] font-bold uppercase sm:self-auto ${
                                    r.status === "APPROVED"
                                      ? "bg-success-soft text-success"
                                      : "bg-warning-soft text-warning"
                                  }`}
                                >
                                  {statusAgendaLabel(r.status)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

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
                          className="rounded-xl bg-background px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {r.date} · {r.eventName}
                            </span>
                            <span className="text-xs font-semibold uppercase text-muted">
                              {r.status}
                            </span>
                          </div>
                          {r.status === "REJECTED" && r.rejectionReason && (
                            <p className="mt-1 text-xs text-danger">
                              Motivo: {r.rejectionReason}
                            </p>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              </>
            ) : (
              <form
                className="mx-auto max-w-xl space-y-5"
                action={(fd) => {
                  setMessage("");
                  startTransition(async () => {
                    const res = await createReservation(fd);
                    if (res.error) {
                      setMessage(res.error);
                      toast(res.error, "error");
                    } else {
                      setMessage(
                        "Solicitud enviada. El comité responderá en un plazo de 24 horas.",
                      );
                      toast("Solicitud de palapa enviada.");
                      setTab("calendar");
                      router.refresh();
                    }
                  });
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl text-primary-dark">
                      Solicitud de Reservación
                    </h3>
                    <p className="text-sm text-muted">Grenaché</p>
                  </div>
                </div>

                <p className="rounded-xl bg-background px-4 py-3 text-sm text-muted">
                  Este formulario es exclusivo para residentes de Grenaché. Las
                  solicitudes son revisadas por el comité con respuesta en 24
                  horas.
                  {houseNumber ? (
                    <>
                      {" "}
                      Solicitante: <strong>Casa {houseNumber}</strong>.
                    </>
                  ) : null}
                </p>

                <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <p>
                    Si adeudas la cuota del <strong>mes en curso</strong> o de{" "}
                    <strong>meses anteriores</strong>, no podrás reservar. Las
                    cuotas de meses futuros (p. ej. octubre) no bloquean la
                    solicitud.
                  </p>
                </div>

                {hasPendingFees ? (
                  <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                    Tienes cuotas de mantenimiento pendientes (mes actual o
                    atrasos). Regulariza en{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/cuotas")}
                      className="font-semibold underline"
                    >
                      Cuotas
                    </button>{" "}
                    para poder enviar una solicitud.
                  </div>
                ) : (
                  <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
                    Estado de pagos: al corriente hasta el mes en curso. Puedes
                    solicitar la palapa.
                  </div>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Fecha deseada para reservación *
                  </span>
                  <input
                    type="date"
                    name="date"
                    required
                    min={minBookable}
                    value={bookingDate}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={hasPendingFees}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Motivo del uso del área común *
                  </span>
                  <textarea
                    name="eventName"
                    required
                    rows={3}
                    disabled={hasPendingFees}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                    placeholder="Ej. Cumpleaños, reunión familiar, evento vecinal, etc."
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Describe brevemente el motivo de tu reservación.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Número de invitados *
                  </span>
                  <input
                    type="number"
                    name="guests"
                    min={1}
                    max={50}
                    required
                    defaultValue={20}
                    disabled={hasPendingFees}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Notas adicionales
                  </span>
                  <textarea
                    name="notes"
                    rows={2}
                    disabled={hasPendingFees}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                    placeholder="Horario estimado, requerimientos, etc."
                  />
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {hasPendingFees
                    ? "No disponible por cuotas pendientes"
                    : "Enviar Solicitud"}
                </button>
                <p className="text-center text-xs text-muted">
                  Una vez enviada, el comité recibirá la notificación con tu
                  casa y los detalles de la solicitud.
                </p>
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
