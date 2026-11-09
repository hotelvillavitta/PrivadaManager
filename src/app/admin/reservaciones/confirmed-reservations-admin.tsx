"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ConfirmedReservationItem = {
  id: string;
  date: string;
  eventName: string;
  guests: number;
  houseNumber: string | null;
  residentName: string;
  payment: "PAGADA" | "POR_VALIDAR" | "SIN_PAGO";
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const PAYMENT_LABEL = {
  PAGADA: "Pagada",
  POR_VALIDAR: "Por validar",
  SIN_PAGO: "Sin pago",
} as const;

function formatDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

export function ConfirmedReservationsAdmin({
  items,
  year,
  month,
}: {
  items: ConfirmedReservationItem[];
  year: number;
  month: number;
}) {
  const [cursor, setCursor] = useState({ year, month });
  const key = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
  const visible = useMemo(
    () => items.filter((item) => item.date.startsWith(key)),
    [items, key],
  );

  function shift(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary-dark">
            Confirmadas ({visible.length})
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cada cobro de palapa de la casa cubre una reservación confirmada,
            de la más antigua a la más reciente.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-primary-dark"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-36 text-center text-sm font-semibold text-primary-dark">
            {MONTHS[cursor.month - 1]} {cursor.year}
          </p>
          <button
            type="button"
            onClick={() => shift(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-primary-dark"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">
          No hay reservaciones confirmadas en este mes.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-primary-dark">{item.eventName}</p>
                <p className="text-sm capitalize text-muted">
                  {formatDay(item.date)}
                  {item.houseNumber ? ` · Casa ${item.houseNumber}` : ""}
                  {item.residentName ? ` · ${item.residentName}` : ""} ·{" "}
                  {item.guests} personas
                </p>
              </div>
              <span
                className={`self-start rounded-full px-2.5 py-1 text-[11px] font-bold uppercase sm:self-auto ${
                  item.payment === "PAGADA"
                    ? "bg-success-soft text-success"
                    : item.payment === "POR_VALIDAR"
                      ? "bg-warning-soft text-warning"
                      : "bg-danger-soft text-danger"
                }`}
              >
                {PAYMENT_LABEL[item.payment]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
