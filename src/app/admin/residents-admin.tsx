"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "@/components/Toast";
import {
  createResident,
  deleteResident,
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
    password: "",
  });

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
      password: "",
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
      password: "",
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
      password: "",
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

      {showForm && (
        <form
          className="mb-4 rounded-xl border border-border bg-background p-4"
          action={(fd) => {
            startTransition(async () => {
              const res = editing
                ? await updateResident(fd)
                : await createResident(fd);
              if (res.error) toast(res.error, "error");
              else {
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
            <input
              name="password"
              type="password"
              required={creating}
              placeholder={
                editing
                  ? "Nueva contraseña (opcional)"
                  : "Contraseña (mín. 6)"
              }
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editing ? "Guardar cambios" : "Crear residente"}
          </button>
        </form>
      )}

      <ul className="divide-y divide-border">
        {residents.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 py-3 text-sm"
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
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/cuotas?casa=${u.houseNumber ?? ""}`}
                className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white"
              >
                Casa {u.houseNumber ?? "—"}
              </Link>
              <button
                type="button"
                title="Editar"
                onClick={() => openEdit(u)}
                className="rounded-lg p-2 text-muted hover:bg-background hover:text-primary"
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
                className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
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
