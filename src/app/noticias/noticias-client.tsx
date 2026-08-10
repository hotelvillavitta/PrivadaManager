"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Filter, Paperclip } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  createNewsPost,
  toggleNewsReaction,
} from "@/lib/actions/portal";
import { NEWS_CATEGORY_LABEL } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  body: string;
  category: string;
  hasDocument: boolean;
  publishedAt: string;
  reactionCounts: Record<string, number>;
  myReactions: string[];
};

const filters = [
  "Todos",
  "Importante",
  "Reglamento",
  "Mantenimiento",
  "Aviso",
  "Comunidad",
] as const;

const categoryStyles: Record<string, string> = {
  Importante: "bg-danger-soft text-danger",
  Reglamento: "bg-primary-soft text-primary",
  Mantenimiento: "bg-warning-soft text-warning",
  Aviso: "bg-primary-soft text-primary",
  Comunidad: "bg-info-soft text-info",
};

const emojiList = ["👍", "❤️", "🎉", "💎", "💡"];

const categoryToEnum: Record<string, string> = {
  Importante: "IMPORTANTE",
  Reglamento: "REGLAMENTO",
  Mantenimiento: "MANTENIMIENTO",
  Aviso: "AVISO",
  Comunidad: "COMUNIDAD",
};

export function NoticiasClient({
  posts,
  isAdmin,
}: {
  posts: Post[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [local, setLocal] = useState(posts);

  const items = useMemo(() => {
    if (filter === "Todos") return local;
    return local.filter(
      (n) => NEWS_CATEGORY_LABEL[n.category] === filter,
    );
  }, [filter, local]);

  function react(id: string, emoji: string) {
    setLocal((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const mine = new Set(p.myReactions);
        const counts = { ...p.reactionCounts };
        if (mine.has(emoji)) {
          mine.delete(emoji);
          counts[emoji] = Math.max(0, (counts[emoji] ?? 1) - 1);
        } else {
          mine.add(emoji);
          counts[emoji] = (counts[emoji] ?? 0) + 1;
        }
        return { ...p, myReactions: [...mine], reactionCounts: counts };
      }),
    );
    startTransition(async () => {
      await toggleNewsReaction(id, emoji);
    });
  }

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Comunicados oficiales"
        title="Noticias y Boletines"
        description="Mantente informado sobre los acontecimientos importantes de nuestra comunidad residencial."
      />

      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        {isAdmin && (
          <form
            className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            action={(fd) => {
              setMessage("");
              startTransition(async () => {
                const res = await createNewsPost(fd);
                if (res.error) setMessage(res.error);
                else {
                  setMessage("Comunicado publicado.");
                  router.refresh();
                }
              });
            }}
          >
            <h3 className="mb-3 font-display text-xl text-primary-dark">
              Publicar comunicado
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="title"
                required
                placeholder="Título"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <select
                name="category"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                defaultValue="AVISO"
              >
                {Object.entries(categoryToEnum).map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Contenido del aviso"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="hasDocument" />
              Incluye documento de consulta
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              Publicar
            </button>
            {message && (
              <p className="mt-2 text-sm text-muted">{message}</p>
            )}
          </form>
        )}

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Filter className="mr-1 h-4 w-4 text-muted" />
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                filter === f
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-muted hover:bg-background"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const label = NEWS_CATEGORY_LABEL[item.category] ?? item.category;
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${categoryStyles[label] ?? "bg-primary-soft text-primary"}`}
                  >
                    {label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(item.publishedAt).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="font-display text-xl uppercase tracking-wide text-primary-dark">
                  {item.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
                {item.hasDocument && (
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted"
                  >
                    <Paperclip className="h-4 w-4" />
                    Documento de consulta
                  </button>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {emojiList.map((emoji) => {
                    const count = item.reactionCounts[emoji] ?? 0;
                    const active = item.myReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(item.id, emoji)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${
                          active
                            ? "bg-primary-soft ring-1 ring-primary/30"
                            : "bg-background hover:bg-primary-soft"
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && (
                          <span className="text-xs text-muted">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
