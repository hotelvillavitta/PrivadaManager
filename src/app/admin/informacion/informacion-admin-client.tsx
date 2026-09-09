"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/Toast";
import { updatePrivadaInfo } from "@/lib/actions/portal";
import type { Privada, PrivadaSchedule } from "@/lib/privada";

export function InformacionAdminClient({ privada }: { privada: Privada }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [address, setAddress] = useState(privada.address);
  const [phone, setPhone] = useState(privada.phone);
  const [email, setEmail] = useState(privada.email);
  const [capacityMax, setCapacityMax] = useState(privada.capacityMax);
  const [capacityNote, setCapacityNote] = useState(privada.capacityNote ?? "");
  const [schedules, setSchedules] = useState<PrivadaSchedule[]>(
    privada.schedules.length
      ? privada.schedules
      : [{ days: "", hours: "" }],
  );
  const [rules, setRules] = useState<string[]>(
    privada.rules.length ? privada.rules : [""],
  );

  return (
    <form
      className="space-y-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
      action={(fd) => {
        fd.set("schedulesJson", JSON.stringify(schedules));
        fd.set("rulesJson", JSON.stringify(rules.filter((r) => r.trim())));
        startTransition(async () => {
          const res = await updatePrivadaInfo(fd);
          if (res.error) toast(res.error, "error");
          else {
            toast("Información de la privada guardada.");
            router.refresh();
          }
        });
      }}
    >
      <div>
        <h2 className="font-display text-2xl text-primary-dark">
          Datos de contacto
        </h2>
        <p className="mt-1 text-sm text-muted">
          Se muestran en el pie de página y en reservaciones.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-primary-dark">
          Dirección
        </span>
        <input
          name="address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-primary-dark">
            Teléfono
          </span>
          <input
            name="phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-primary-dark">
            Correo
          </span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="font-display text-xl text-primary-dark">
          Capacidad del área común
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-primary-dark">
              Capacidad máxima
            </span>
            <input
              name="capacityMax"
              type="number"
              min={1}
              max={500}
              required
              value={capacityMax}
              onChange={(e) => setCapacityMax(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-primary-dark">
              Descripción (opcional)
            </span>
            <input
              name="capacityNote"
              value={capacityNote}
              onChange={(e) => setCapacityNote(e.target.value)}
              placeholder="Capacidad máxima del salón"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-xl text-primary-dark">Horarios</h3>
          <button
            type="button"
            onClick={() =>
              setSchedules((s) => [...s, { days: "", hours: "" }])
            }
            className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        <div className="space-y-2">
          {schedules.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={row.days}
                onChange={(e) =>
                  setSchedules((list) =>
                    list.map((item, i) =>
                      i === idx ? { ...item, days: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Días (ej. Domingo a Jueves)"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={row.hours}
                onChange={(e) =>
                  setSchedules((list) =>
                    list.map((item, i) =>
                      i === idx ? { ...item, hours: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Horario (ej. 12:00 pm - 22:00 pm)"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setSchedules((list) => list.filter((_, i) => i !== idx))
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-xl text-primary-dark">Reglamento</h3>
          <button
            type="button"
            onClick={() => setRules((r) => [...r, ""])}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar regla
          </button>
        </div>
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <textarea
                value={rule}
                rows={2}
                onChange={(e) =>
                  setRules((list) =>
                    list.map((item, i) => (i === idx ? e.target.value : item)),
                  )
                }
                placeholder="Regla del área común…"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setRules((list) => list.filter((_, i) => i !== idx))
                }
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
