"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Search } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { createProvider } from "@/lib/actions/portal";

type Provider = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  category: string;
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
            className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = await createProvider(fd);
                if (res.error) setMessage(res.error);
                else {
                  setMessage("Proveedor agregado.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-3 font-display text-xl text-primary-dark">
              Agregar contacto
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                required
                placeholder="Nombre"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="role"
                required
                placeholder="Rol / descripción"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="phone"
                required
                placeholder="Teléfono"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="email"
                placeholder="Email (opcional)"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                name="category"
                defaultValue="Otro"
                placeholder="Categoría"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar
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
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                  >
                    <h3 className="font-semibold text-primary-dark">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{p.role}</p>
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
