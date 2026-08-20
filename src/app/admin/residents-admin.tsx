"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, Pencil, Trash2, UserPlus, X } from "lucide-react";
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
  role?: "COLONO" | "ADMIN";
};

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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    houseNumber: "",
    accessCode: "",
    role: "COLONO" as "COLONO" | "ADMIN",
  });
  const [issued, setIssued] = useState<{
    name: string;
    password: string;
    emailed: boolean;
  } | null>(null);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      houseNumber: "",
      accessCode: "",
      role: "COLONO",
    });
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
      role: u.role ?? "COLONO",
    });
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      houseNumber: "",
      accessCode: "",
      role: "COLONO",
    });
  }

  const showForm = creating || editing;

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
      {showForm && (
        <form
          className="mb-4 rounded-xl border border-border bg-background p-3 sm:p-4"
          action={(fd) => {
            startTransition(async () => {
              const res = editing
                ? await updateResident(fd)
                : await createResident(fd);
              if (res.error) toast(res.error, "error");
              else {
                if (!editing && "temporaryPassword" in res && res.temporaryPassword) {
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
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <input
              name="lastName"
              required
              placeholder="Apellido"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="houseNumber"
              placeholder="Casa"
              value={form.houseNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, houseNumber: e.target.value }))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <input
              name="accessCode"
              placeholder="Clave de acceso"
              value={form.accessCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, accessCode: e.target.value }))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="COLONO">Colono</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-muted">
            {creating
              ? "Al crear se genera una contraseña inicial y se envía al correo."
              : "La contraseña se genera con el botón de llave, no se escribe aquí."}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editing ? "Guardar cambios" : "Crear y generar contraseña"}
          </button>
        </form>
      )}

      <ul className="divide-y divide-border">
        {residents.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-primary-dark">
                {u.firstName} {u.lastName}
                {u.role === "ADMIN" && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                    Admin
                  </span>
                )}
              </p>
              <p className="truncate text-muted">{u.email}</p>
            </div>
            <div className="flex w-full shrink-0 items-center justify-between gap-1 sm:w-auto sm:justify-start">
              <Link
                href={`/admin/cobranza?casa=${u.houseNumber ?? ""}`}
                className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white"
              >
                Casa {u.houseNumber ?? "—"}
              </Link>
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Editar"
                onClick={() => openEdit(u)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
