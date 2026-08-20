"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gavel, X } from "lucide-react";
import { toast } from "@/components/Toast";
import { annulFine, issueFine } from "@/lib/actions/portal";
import {
  FINE_CATEGORIES,
  FINE_CAUSES,
  type FineCategory,
} from "@/lib/fines/catalog";
import {
  feeLabel,
  formatCurrency,
} from "@/lib/utils";

type PendingFine = {
  id: string;
  houseNumber: string;
  category: string;
  cause: string;
  regulationArticle: string;
  amount: number;
  notes: string | null;
  issuedAt: string;
  billingYear: number;
  billingMonth: number;
};

export function FinesAdmin({
  houses,
  pendingFines,
}: {
  houses: string[];
  pendingFines: PendingFine[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [houseNumber, setHouseNumber] = useState(houses[0] ?? "");
  const [category, setCategory] = useState<FineCategory>(FINE_CATEGORIES[0]);
  const [causeId, setCauseId] = useState(
    () => FINE_CAUSES.find((c) => c.category === FINE_CATEGORIES[0])?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const causes = useMemo(
    () => FINE_CAUSES.filter((c) => c.category === category),
    [category],
  );
  const selectedCause = FINE_CAUSES.find((c) => c.id === causeId) ?? causes[0];

  function onCategoryChange(next: FineCategory) {
    setCategory(next);
    const first = FINE_CAUSES.find((c) => c.category === next);
    setCauseId(first?.id ?? "");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl text-primary-dark">
          <Gavel className="h-5 w-5 text-primary" />
          Multas y sanciones
        </h2>
        <p className="text-sm text-muted">
          El monto se suma a la cuota del mes con adeudo más antiguo del
          residente (actual o anterior). Si está al corriente, se usa el
          periodo de cobro vigente. Se liquida al registrar esa cuota.
        </p>
      </div>

      <form
        className="space-y-3 rounded-xl border border-border bg-background p-4"
        action={(fd) => {
          startTransition(async () => {
            const res = await issueFine(fd);
            if (res.error) {
              toast(res.error, "error");
              return;
            }
            const period =
              "billingYear" in res && res.billingYear && res.billingMonth
                ? feeLabel(res.billingYear, res.billingMonth)
                : "la cuota con adeudo";
            toast(`Multa aplicada · se suma a cuota ${period}.`);
            setAmount("");
            setNotes("");
            router.refresh();
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-primary-dark">Casa</span>
            <select
              name="houseNumber"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              required
              className="rounded-xl border border-border bg-surface px-3 py-2"
            >
              {houses.map((h) => (
                <option key={h} value={h}>
                  Casa {h}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-primary-dark">Monto</span>
            <input
              name="amount"
              type="number"
              min={1}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej. 100"
              className="rounded-xl border border-border bg-surface px-3 py-2"
            />
          </label>
        </div>

        <p className="rounded-xl bg-primary-soft/50 px-3 py-2 text-xs text-primary-dark">
          Si la casa debe meses anteriores o el mes en curso, la multa se carga
          ahí (no a un mes futuro). Ejemplo: adeudo de agosto → se cobra con
          agosto, aunque ya no estemos en periodo de cobro.
        </p>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-primary-dark">Categoría</span>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as FineCategory)}
            className="rounded-xl border border-border bg-surface px-3 py-2"
          >
            {FINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-primary-dark">Falta</span>
          <select
            name="causeId"
            value={causeId}
            onChange={(e) => setCauseId(e.target.value)}
            required
            className="rounded-xl border border-border bg-surface px-3 py-2"
          >
            {causes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {selectedCause && (
          <div className="rounded-xl border border-primary/20 bg-primary-soft/40 px-3 py-3 text-sm">
            <p className="font-semibold text-primary-dark">
              Fundamento · {selectedCause.article}
            </p>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">
              {selectedCause.excerpt}
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-primary-dark">
            Notas (opcional)
          </span>
          <textarea
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle adicional para el residente…"
            className="rounded-xl border border-border bg-surface px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={pending || !houseNumber || !causeId || !amount}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Aplicando…" : "Aplicar multa"}
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-display text-lg text-primary-dark">
          Multas pendientes (van en cuota)
        </h3>
        {pendingFines.length === 0 ? (
          <p className="text-sm text-muted">No hay multas pendientes.</p>
        ) : (
          <ul className="space-y-3">
            {pendingFines.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-border bg-background px-3 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-primary-dark">
                      Casa {f.houseNumber} · {formatCurrency(f.amount)}
                    </p>
                    <p className="text-sm text-muted">{f.cause}</p>
                    <p className="mt-1 text-xs text-muted">
                      {f.category} · {f.regulationArticle} · Cuota{" "}
                      {feeLabel(f.billingYear, f.billingMonth)} ·{" "}
                      {new Date(f.issuedAt).toLocaleDateString("es-MX", {
                        dateStyle: "medium",
                      })}
                    </p>
                    {f.notes && (
                      <p className="mt-1 text-xs text-muted">Notas: {f.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/cobranza?casa=${f.houseNumber}`}
                      className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Ir a cobranza
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await annulFine(f.id);
                          if (res.error) toast(res.error, "error");
                          else {
                            toast("Multa anulada y descontada de la cuota.");
                            router.refresh();
                          }
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Anular
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
