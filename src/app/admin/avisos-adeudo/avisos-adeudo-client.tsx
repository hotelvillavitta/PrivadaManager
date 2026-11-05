"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Mail, Search } from "lucide-react";
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
  const [downloading, setDownloading] = useState(false);
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

  const selectable = filtered;
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

  async function downloadPdf() {
    const ids = (chosen.length ? chosen : preview ? [preview] : []).map(
      (house) => house.houseNumber,
    );
    if (!ids.length) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/admin/avisos-adeudo/pdf?casas=${encodeURIComponent(ids.join(","))}`,
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast(data?.error ?? "No se pudo crear el PDF.", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const match = res.headers
        .get("Content-Disposition")
        ?.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] ?? "aviso-adeudo.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("No se pudo crear el PDF.", "error");
    } finally {
      setDownloading(false);
    }
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
              El correo y el PDF usan el mismo diseño que el comprobante de
              pago. El correo llega a los propietarios. El PDF se descarga
              aunque la casa no tenga correo.
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
              Elegir las casas de esta lista ({selectable.length})
            </label>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {filtered.map((house) => {
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
                          {house.recipients.length
                            ? house.recipients.map((r) => r.name).join(" · ")
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={downloading || (!chosen.length && !preview)}
            onClick={() => void downloadPdf()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary-dark disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading
              ? "Preparando PDF…"
              : `Descargar PDF${chosen.length > 0 ? ` · ${chosen.length}` : ""}`}
          </button>
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
          <article className="mt-3 max-h-[70vh] overflow-auto rounded-2xl border border-[#e0d5cb] bg-[#f4efe8] p-3 text-sm">
            <div className="overflow-hidden rounded-2xl border border-[#e0d5cb] bg-white">
              <div className="flex items-center gap-3 border-b border-[#efe6dc] bg-[#faf6f1] px-4 py-4">
                <img
                  src="/brand/grenache-logo.png"
                  alt=""
                  className="h-12 w-12 rounded-full bg-white outline outline-[#e8dfd6]"
                />
                <div>
                  <p className="font-display text-xl text-[#4f334a]">{privadaName}</p>
                  <p className="text-xs text-[#8a7a86]">App Residencial</p>
                  <p className="mt-1 text-[11px] font-bold tracking-[0.14em] text-[#b08a5a] uppercase">
                    Aviso de adeudo
                  </p>
                </div>
              </div>
              <div className="space-y-4 px-4 py-4">
                <p className="text-[#2a1c28]">
                  {preview.recipients.length
                    ? `Hola ${preview.recipients.map((r) => r.name).join(", ")},`
                    : `Estimado(a) residente de la Casa ${preview.houseNumber}:`}
                </p>
                <p className="text-[#5a4a57]">
                  El comité registra un adeudo de{" "}
                  {preview.months === 1 ? "1 mes" : `${preview.months} meses`} en
                  las cuotas de mantenimiento. Este es el aviso oficial.
                </p>
                <dl className="rounded-xl border border-[#e8dfd6] bg-[#f8f4ef] px-3 py-2 text-xs">
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-[#5a4a57]">Casa</dt>
                    <dd className="font-semibold text-[#2a1c28]">{preview.houseNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-[#5a4a57]">Meses pendientes</dt>
                    <dd className="font-semibold text-[#2a1c28]">
                      {preview.months === 1 ? "1 mes" : `${preview.months} meses`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-[#5a4a57]">Fecha del aviso</dt>
                    <dd className="font-semibold text-[#2a1c28]">{issuedOnLabel}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between rounded-xl bg-[#efe4ec] px-3 py-3">
                  <p className="text-xs font-bold text-[#4f334a]">Adeudo total</p>
                  <p className="font-display text-lg text-[#8b3a3a]">{preview.totalLabel}</p>
                </div>
                <table className="w-full overflow-hidden rounded-xl border border-[#e8dfd6] text-left text-xs">
                  <thead className="bg-[#efe4ec] text-[11px] tracking-wide text-[#4f334a] uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Mes</th>
                      <th className="px-3 py-2 text-right font-semibold">Monto</th>
                      <th className="px-3 py-2 text-right font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line) => (
                      <tr key={line.label} className="border-t border-[#e8dfd6]">
                        <td className="px-3 py-2 text-[#2a1c28]">{line.label}</td>
                        <td className="px-3 py-2 text-right">{line.amountLabel}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#8b3a3a]">
                          Pendiente
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#e8dfd6] bg-[#f8f4ef]">
                      <td className="px-3 py-2 font-bold text-[#2a1c28]">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-[#8b3a3a]" colSpan={2}>
                        {preview.totalLabel}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div>
                  <p className="font-display text-base text-[#4f334a]">
                    Consecuencias por falta de pago
                  </p>
                  <ul className="mt-2 space-y-1.5 rounded-xl border border-[#e8dfd6] bg-[#f8f4ef] px-3 py-3 text-xs text-[#2a1c28]">
                    {DEBT_NOTICE_CONSEQUENCES.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs leading-relaxed text-[#5a4a57]">
                  Para ponerse al corriente, responde al correo o contacta al
                  tesorero o al Comité Vecinal.
                </p>
              </div>
            </div>
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
