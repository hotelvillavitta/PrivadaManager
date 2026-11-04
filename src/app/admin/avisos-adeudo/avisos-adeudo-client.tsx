"use client";

import { useMemo, useState, useTransition } from "react";
import { Mail, Search } from "lucide-react";
import { toast } from "@/components/Toast";
import { sendDebtNotices } from "@/lib/actions/debt-notice";
import {
  DEBT_NOTICE_CONSEQUENCES,
  type DebtNoticeHouse,
} from "@/lib/fees/debt-notice-shared";

export function DebtNoticesAdmin({
  houses,
  issuedOnLabel,
  privadaName,
}: {
  houses: DebtNoticeHouse[];
  issuedOnLabel: string;
  privadaName: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [previewHouse, setPreviewHouse] = useState(
    houses[0]?.houseNumber ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return houses;
    return houses.filter((house) => {
      const names = house.recipients.map((r) => r.name).join(" ");
      return (
        house.houseNumber.includes(q) ||
        names.toLowerCase().includes(q) ||
        house.recipients.some((r) => r.email.toLowerCase().includes(q))
      );
    });
  }, [houses, query]);

  const selectable = filtered.filter((house) => house.recipients.length > 0);
  const allChecked =
    selectable.length > 0 &&
    selectable.every((house) => selected.includes(house.houseNumber));
  const preview =
    houses.find((house) => house.houseNumber === previewHouse) ??
    filtered[0] ??
    null;
  const chosen = houses.filter((house) =>
    selected.includes(house.houseNumber),
  );

  function toggle(houseNumber: string) {
    setConfirming(false);
    setPreviewHouse(houseNumber);
    setSelected((prev) =>
      prev.includes(houseNumber)
        ? prev.filter((id) => id !== houseNumber)
        : [...prev, houseNumber],
    );
  }

  function toggleAll() {
    setConfirming(false);
    setSelected((prev) => {
      const visible = new Set(selectable.map((house) => house.houseNumber));
      if (allChecked) return prev.filter((id) => !visible.has(id));
      return [...new Set([...prev, ...visible])];
    });
  }

  function send() {
    startTransition(async () => {
      const res = await sendDebtNotices(selected);
      setConfirming(false);
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      const parts = [
        res.sentHouses === 1
          ? "Aviso enviado a 1 casa"
          : `Avisos enviados a ${res.sentHouses} casas`,
        res.sentEmails === 1 ? "1 correo" : `${res.sentEmails} correos`,
      ];
      if (res.failed.length) {
        toast(
          `${parts.join(" · ")}. No salió el correo de las casas ${res.failed.map((item) => item.houseNumber).join(", ")}.`,
          "error",
        );
      } else if (res.skipped.length && res.sentHouses === 0) {
        toast("No se envió ningún aviso.", "error");
      } else {
        toast(`${parts.join(" · ")}.`);
        setSelected([]);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-primary-dark">
              Aviso de adeudo
            </h2>
            <p className="mt-1 text-sm text-muted">
              El correo incluye los meses de mantenimiento pendientes, el total
              y las consecuencias. Llega a los propietarios de cada casa.
            </p>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="sr-only">Buscar casa</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Casa, nombre o correo"
              className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm"
            />
          </div>
        </label>

        {houses.length === 0 ? (
          <p className="rounded-xl bg-background px-4 py-6 text-sm text-muted">
            No hay casas con adeudo de mantenimiento.
          </p>
        ) : (
          <>
            <label className="mb-2 flex items-center gap-2 text-sm text-primary-dark">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Elegir las casas con correo de esta lista ({selectable.length})
            </label>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {filtered.map((house) => {
                const canSend = house.recipients.length > 0;
                const checked = selected.includes(house.houseNumber);
                return (
                  <li key={house.houseNumber}>
                    <label
                      onClick={() => setPreviewHouse(house.houseNumber)}
                      className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${
                        preview?.houseNumber === house.houseNumber
                          ? "bg-primary-soft/50"
                          : "bg-background"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canSend}
                        onChange={() => toggle(house.houseNumber)}
                        className="mt-1 h-4 w-4 accent-[var(--primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium text-primary-dark">
                            Casa {house.houseNumber}
                          </span>
                          <span className="font-semibold text-primary-dark">
                            {house.totalLabel}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {house.months === 1
                            ? "1 mes"
                            : `${house.months} meses`}
                          {" · "}
                          {canSend
                            ? house.recipients
                                .map((r) => r.name)
                                .join(" · ")
                            : "Sin correo de propietario"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {filtered.length === 0 && (
              <p className="mt-3 text-sm text-muted">Sin coincidencias.</p>
            )}
          </>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          {confirming ? (
            <>
              <button
                type="button"
                disabled={pending || chosen.length === 0}
                onClick={send}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending
                  ? "Enviando…"
                  : `Confirmar envío a ${chosen.length} ${chosen.length === 1 ? "casa" : "casas"}`}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-primary-dark"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => {
                if (chosen[0]) setPreviewHouse(chosen[0].houseNumber);
                setConfirming(true);
              }}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Enviar aviso
              {chosen.length > 0 ? ` · ${chosen.length}` : ""}
            </button>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Vista previa
        </p>
        {preview ? (
          <article className="mt-3 rounded-xl border border-border bg-[#faf6f1] p-4 text-sm">
            <p className="font-display text-lg text-primary-dark">{privadaName}</p>
            <p className="text-xs text-muted">{issuedOnLabel}</p>
            <h3 className="mt-3 font-display text-base leading-snug text-primary-dark">
              Aviso de adeudo de cuotas de mantenimiento
            </h3>
            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
              <p className="font-semibold text-primary-dark">
                Casa #{preview.houseNumber}
              </p>
              <p className="text-right font-semibold text-[#8b3a3a]">
                Adeudo total: {preview.totalLabel}
              </p>
            </div>
            <p className="mt-3 text-primary-dark">
              Estimado(a) residente de la Casa #{preview.houseNumber}:
            </p>
            <p className="mt-2 text-muted">
              Su cuenta presenta un adeudo de{" "}
              {preview.months === 1 ? "1 mes" : `${preview.months} meses`}.
            </p>
            <table className="mt-3 w-full text-left text-xs">
              <thead>
                <tr className="text-primary-dark">
                  <th className="py-1 font-semibold">Mes</th>
                  <th className="py-1 text-right font-semibold">Monto</th>
                  <th className="py-1 text-right font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.label} className="border-t border-border/70">
                    <td className="py-1.5">{line.label}</td>
                    <td className="py-1.5 text-right">{line.amountLabel}</td>
                    <td className="py-1.5 text-right text-[#8b3a3a]">
                      Pendiente
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-medium text-primary-dark">
              Consecuencias por falta de pago
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
              {DEBT_NOTICE_CONSEQUENCES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Elige una casa para ver el aviso.
          </p>
        )}
      </aside>
    </div>
  );
}
