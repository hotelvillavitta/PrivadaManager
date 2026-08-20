"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Phone, Search, Trash2, X } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import {
  createProvider,
  deleteProvider,
  updateProvider,
} from "@/lib/actions/portal";
import { useScrollToForm } from "@/lib/use-scroll-to-form";

type Provider = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  category: string;
};

const emptyForm = {
  name: "",
  role: "",
  phone: "",
  email: "",
  category: "Otro",
};

export function DirectorioClient({
  providers,
  isAdmin,
}: {
  providers: Provider[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState(emptyForm);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(providers.map((p) => p.category)))],
    [providers],
  );

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchCat = category === "Todas" || p.category === category;
      const q = query.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.phone.includes(q);
      return matchCat && matchQ;
    });
  }, [query, category, providers]);

  const grouped = useMemo(() => {
    const map = new Map<string, Provider[]>();
    for (const p of filtered) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function startEdit(p: Provider) {
    setEditing(p);
    setForm({
      name: p.name,
      role: p.role,
      phone: p.phone,
      email: p.email ?? "",
      category: p.category,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
  }

  const formRef = useScrollToForm(editing?.id);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Comunidad"
        title="Directorio de Proveedores"
        description="Contactos de servicios, comida, emprendimientos y proveedores recomendados de tu privada."
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-6">
        {isAdmin && (
          <form
            ref={formRef}
            className="mb-6 scroll-mt-28 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:mb-8 sm:p-5"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = editing
                  ? await updateProvider(fd)
                  : await createProvider(fd);
                if (res.error) {
                  setMessage(res.error);
                  toast(res.error, "error");
                } else {
                  setMessage(
                    editing ? "Contacto actualizado." : "Proveedor agregado.",
                  );
                  toast(editing ? "Contacto actualizado." : "Proveedor agregado.");
                  cancelEdit();
                  router.refresh();
                }
              });
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-xl text-primary-dark">
                {editing ? "Editar contacto" : "Agregar contacto"}
              </h3>
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              )}
            </div>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="role"
                required
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Rol / descripción"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="phone"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Teléfono"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (opcional)"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Categoría"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editing ? "Guardar cambios" : "Guardar"}
            </button>
            {message && <p className="mt-2 text-sm text-muted">{message}</p>}
          </form>
        )}

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar proveedor..."
              className="w-full rounded-xl border border-border bg-surface py-3 pr-4 pl-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "Todas" ? "Todas las categorías" : c}
              </option>
            ))}
          </select>
        </div>

        {grouped.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
            No se encontraron proveedores.
          </p>
        )}

        <div className="space-y-8">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-4 font-display text-2xl text-primary-dark">
                {cat}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {items.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-primary-dark">
                          {p.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted">{p.role}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => startEdit(p)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            disabled={pending}
                            onClick={() => {
                              if (
                                !confirm(
                                  `¿Eliminar a ${p.name} del directorio?`,
                                )
                              )
                                return;
                              startTransition(async () => {
                                const res = await deleteProvider(p.id);
                                if (res.error) toast(res.error, "error");
                                else {
                                  toast("Contacto eliminado.");
                                  if (editing?.id === p.id) cancelEdit();
                                  router.refresh();
                                }
                              });
                            }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-2 text-muted hover:text-primary"
                      >
                        <Phone className="h-4 w-4" />
                        {p.phone}
                      </a>
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-2 text-muted hover:text-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {p.email}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
