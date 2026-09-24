"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Search } from "lucide-react";
import { toast } from "@/components/Toast";
import { createReservationAsAdmin } from "@/lib/actions/portal";

type HouseOption = {
  houseNumber: string;
  residents: string[];
};

function minBookableDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminCreateReservation({
  houses,
  capacityMax = 50,
}: {
  houses: HouseOption[];
  capacityMax?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [houseQuery, setHouseQuery] = useState("");
  const [houseNumber, setHouseNumber] = useState(houses[0]?.houseNumber ?? "");
  const [date, setDate] = useState(minBookableDate());
  const minDate = minBookableDate();

  const filtered = useMemo(() => {
    const q = houseQuery.trim().toLowerCase();
    if (!q) return houses;
    return houses.filter(
      (h) =>
        h.houseNumber.toLowerCase().includes(q) ||
        h.residents.some((r) => r.toLowerCase().includes(q)),
    );
  }, [houses, houseQuery]);

  const selected = houses.find((h) => h.houseNumber === houseNumber);

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        startTransition(async () => {
          const res = await createReservationAsAdmin(fd);
          if (res.error) {
            toast(res.error, "error");
            return;
          }
          toast(
            res.status === "APPROVED"
              ? "Reservación registrada y aprobada."
              : "Solicitud registrada a nombre de la casa.",
          );
          setHouseQuery("");
          setDate(minBookableDate());
          router.refresh();
        });
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl text-primary-dark">
            Reservar a nombre de un residente
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Para vecinos sin acceso a la app o que necesiten ayuda. Se aplican
            adeudo/convenio; como admin puedes reservar desde mañana (sin la
            semana de anticipación de los residentes).
          </p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-primary-dark">
          Buscar casa *
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={houseQuery}
            onChange={(e) => setHouseQuery(e.target.value)}
            placeholder="Número o nombre…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-primary-dark">
          Casa *
        </span>
        <select
          name="houseNumber"
          required
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {filtered.length === 0 ? (
            <option value="">Sin coincidencias</option>
          ) : (
            filtered.map((h) => (
              <option key={h.houseNumber} value={h.houseNumber}>
                Casa {h.houseNumber}
                {h.residents.length
                  ? ` — ${h.residents.slice(0, 2).join(", ")}`
                  : ""}
              </option>
            ))
          )}
        </select>
        {selected?.residents.length ? (
          <p className="mt-1 text-xs text-muted">
            {selected.residents.join(" · ")}
          </p>
        ) : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-primary-dark">
            Fecha *
          </span>
          <input
            type="date"
            name="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-primary-dark">
            Invitados *
          </span>
          <input
            type="number"
            name="guests"
            min={1}
            max={capacityMax}
            required
            defaultValue={Math.min(20, capacityMax)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-primary-dark">
          Motivo *
        </span>
        <input
          name="eventName"
          required
          placeholder="Ej. Cumpleaños, reunión familiar…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-primary-dark">
          Notas
        </span>
        <textarea
          name="notes"
          rows={2}
          placeholder="Horario, contacto, etc."
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>

      <label className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm">
        <input
          type="checkbox"
          name="approveNow"
          className="mt-0.5"
        />
        <span>
          <strong className="text-primary-dark">Aprobar de inmediato</strong>
          <span className="mt-0.5 block text-xs text-muted">
            Úsalo si el pago ya quedó acordado con Kenia Medina (casa 12). Si no,
            deja la solicitud pendiente y apruébala después.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !houseNumber || filtered.length === 0}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Registrando…" : "Registrar reservación"}
      </button>
    </form>
  );
}
