"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { AdminFormSheet } from "@/components/AdminFormSheet";
import { toast } from "@/components/Toast";
import {
  createResident,
  deleteResident,
  generateResidentPassword,
  updateResident,
} from "@/lib/actions/portal";

type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  houseNumber: string | null;
  accessCode?: string | null;
  gateCode?: string | null;
  role?: "COLONO" | "ADMIN";
  occupancyType?: "PROPIETARIO" | "INQUILINO";
  isPrimary?: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  houseNumber: string;
  accessCode: string;
  gateCode: string;
  role: "COLONO" | "ADMIN";
  occupancyType: "PROPIETARIO" | "INQUILINO";
  isPrimary: boolean;
};

const emptyForm = (): FormState => ({
  firstName: "",
  lastName: "",
  email: "",
  houseNumber: "",
  accessCode: "",
  gateCode: "",
  role: "COLONO",
  occupancyType: "PROPIETARIO",
  isPrimary: true,
});

function sortHouseKey(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "es");
}

function OccupancyBadge({ type }: { type?: string }) {
  if (type === "INQUILINO") {
    return (
      <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
        Inquilino
      </span>
    );
  }
  return (
    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
      Propietario
    </span>
  );
}

export function ResidentsAdmin({
  residents,
  currentUserId,
}: {
  residents: Resident[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Resident | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [issued, setIssued] = useState<{
    name: string;
    password: string;
    emailed: boolean;
  } | null>(null);

  const houseGroups = useMemo(() => {
    const map = new Map<string, Resident[]>();
    const noHouse: Resident[] = [];
    for (const u of residents) {
      if (!u.houseNumber) {
        noHouse.push(u);
        continue;
      }
      const list = map.get(u.houseNumber) ?? [];
      list.push(u);
      map.set(u.houseNumber, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`,
          "es",
        );
      });
    }
    const houses = [...map.entries()]
      .map(([houseNumber, members]) => ({
        houseNumber,
        primary: members.find((m) => m.isPrimary) ?? members[0]!,
        secondaries: members.filter(
          (m) => m.id !== (members.find((x) => x.isPrimary) ?? members[0])!.id,
        ),
      }))
      .sort((a, b) => sortHouseKey(a.houseNumber, b.houseNumber));
    return { houses, noHouse };
  }, [residents]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm());
  }

  function openEdit(u: Resident) {
    setCreating(false);
    setEditing(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      houseNumber: u.houseNumber ?? "",
      accessCode: u.accessCode ?? "",
      gateCode: u.gateCode ?? "",
      role: u.role ?? "COLONO",
      occupancyType: u.occupancyType ?? "PROPIETARIO",
      isPrimary: u.isPrimary ?? false,
    });
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm());
  }

  function toggleHouse(house: string) {
    setExpanded((prev) => ({ ...prev, [house]: !prev[house] }));
  }

  function ResidentActions({ u }: { u: Resident }) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Generar contraseña inicial"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `¿Generar una contraseña inicial para ${u.firstName} y enviarla a ${u.email}? La anterior dejará de funcionar.`,
              )
            )
              return;
            startTransition(async () => {
              const res = await generateResidentPassword(u.id);
              if (res.error) toast(res.error, "error");
              else if ("temporaryPassword" in res && res.temporaryPassword) {
                setIssued({
                  name: `${u.firstName} ${u.lastName}`,
                  password: res.temporaryPassword,
                  emailed: Boolean(res.emailed),
                });
                toast(
                  res.emailed
                    ? "Contraseña enviada por correo."
                    : "Contraseña generada (revisa el recuadro).",
                );
              }
            });
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Editar"
          onClick={() => openEdit(u)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Eliminar"
          disabled={pending || u.id === currentUserId}
          onClick={() => {
            if (
              !confirm(
                `¿Eliminar a ${u.firstName} ${u.lastName}? Esta acción no se puede deshacer.`,
              )
            )
              return;
            startTransition(async () => {
              const res = await deleteResident(u.id);
              if (res.error) toast(res.error, "error");
              else {
                toast("Residente eliminado.");
                if (editing?.id === u.id) closeForm();
                router.refresh();
              }
            });
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  function ResidentRow({
    u,
    nested = false,
  }: {
    u: Resident;
    nested?: boolean;
  }) {
    return (
      <div
        className={`flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
          nested ? "border-t border-border/70 pl-2 sm:pl-4" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 font-medium text-primary-dark">
            <span>
              {u.firstName} {u.lastName}
            </span>
            <OccupancyBadge type={u.occupancyType} />
            {u.isPrimary && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                Principal
              </span>
            )}
            {u.role === "ADMIN" && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                Admin
              </span>
            )}
          </p>
          <p className="truncate text-muted">{u.email}</p>
        </div>
        <ResidentActions u={u} />
      </div>
    );
  }

  const showForm = Boolean(creating || editing);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-primary-dark">Residentes</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          <UserPlus className="h-3.5 w-3.5" /> Nuevo
        </button>
      </div>

      {issued && (
        <div className="mb-4 rounded-xl border border-primary/25 bg-primary-soft/60 px-4 py-3 text-sm">
          <p className="font-semibold text-primary-dark">
            Contraseña inicial · {issued.name}
          </p>
          <p className="mt-1 font-mono text-lg tracking-wide text-primary">
            {issued.password}
          </p>
          <p className="mt-1 text-xs text-muted">
            {issued.emailed
              ? "También se envió al correo del residente, con un enlace para cambiarla."
              : "No se pudo enviar el correo. Cópiala y entrégala en persona."}
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-primary hover:underline"
            onClick={() => setIssued(null)}
          >
            Ocultar
          </button>
        </div>
      )}

      <AdminFormSheet open={showForm} onClose={closeForm}>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = editing
                ? await updateResident(fd)
                : await createResident(fd);
              if (res.error) toast(res.error, "error");
              else {
                if (
                  !editing &&
                  "temporaryPassword" in res &&
                  res.temporaryPassword
                ) {
                  setIssued({
                    name: `${form.firstName} ${form.lastName}`.trim(),
                    password: res.temporaryPassword,
                    emailed: Boolean(res.emailed),
                  });
                }
                toast(editing ? "Residente actualizado." : "Residente creado.");
                closeForm();
                router.refresh();
              }
            });
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-primary-dark">
              {editing ? "Editar residente" : "Nuevo residente"}
            </p>
            <button type="button" onClick={closeForm} className="text-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="firstName"
              required
              placeholder="Nombre"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              name="lastName"
              required
              placeholder="Apellido"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Correo"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="houseNumber"
              placeholder="Casa"
              value={form.houseNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, houseNumber: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              name="role"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as "COLONO" | "ADMIN",
                }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="COLONO">Colono</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              name="occupancyType"
              value={form.occupancyType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  occupancyType: e.target.value as
                    | "PROPIETARIO"
                    | "INQUILINO",
                }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="PROPIETARIO">Propietario</option>
              <option value="INQUILINO">Inquilino</option>
            </select>
            <label className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="isPrimary"
                checked={form.isPrimary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isPrimary: e.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                <strong className="text-primary-dark">
                  Contacto principal de la casa
                </strong>
                <span className="mt-0.5 block text-xs text-muted">
                  Aparece en el listado. Los demás se muestran al expandir la
                  casa.
                </span>
              </span>
            </label>
            {form.occupancyType === "INQUILINO" && (
              <p className="rounded-lg bg-warning-soft/50 px-3 py-2 text-xs text-foreground sm:col-span-2">
                Los inquilinos no tienen acceso a la sección Finanzas en la app.
              </p>
            )}
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <p className="text-xs font-medium text-primary-dark sm:col-span-2">
                Claves de acceso físico (opcionales)
              </p>
              <input
                name="accessCode"
                placeholder="Clave de acceso peatonal"
                value={form.accessCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accessCode: e.target.value }))
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                aria-label="Clave de acceso peatonal"
              />
              <input
                name="gateCode"
                placeholder="Clave de acceso de portón"
                value={form.gateCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gateCode: e.target.value }))
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                aria-label="Clave de acceso de portón"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            {creating
              ? "Al crear se genera una contraseña de acceso a la app y se envía al correo del residente."
              : "La contraseña de la app no se edita aquí: usa el botón de llave en la lista para generar una nueva y enviarla por correo."}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editing ? "Guardar cambios" : "Crear y generar contraseña"}
          </button>
        </form>
      </AdminFormSheet>

      <ul className="divide-y divide-border">
        {houseGroups.houses.map(({ houseNumber, primary, secondaries }) => {
          const open = Boolean(expanded[houseNumber]);
          const hasMore = secondaries.length > 0;
          return (
            <li key={houseNumber} className="py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/cobranza?casa=${houseNumber}`}
                      className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
                    >
                      Casa {houseNumber}
                    </Link>
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => toggleHouse(houseNumber)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-background hover:text-primary-dark"
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        {secondaries.length} secundario
                        {secondaries.length === 1 ? "" : "s"}
                      </button>
                    )}
                  </div>
                  <ResidentRow u={primary} />
                  {open &&
                    secondaries.map((u) => (
                      <ResidentRow key={u.id} u={u} nested />
                    ))}
                </div>
              </div>
            </li>
          );
        })}

        {houseGroups.noHouse.length > 0 && (
          <li className="py-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Sin casa asignada
            </p>
            {houseGroups.noHouse.map((u) => (
              <ResidentRow key={u.id} u={u} />
            ))}
          </li>
        )}
      </ul>
    </div>
  );
}
