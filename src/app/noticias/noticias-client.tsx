"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Filter,
  Paperclip,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "@/components/Toast";
import {
  createNewsPost,
  deleteNewsPost,
  toggleNewsReaction,
  updateNewsPost,
} from "@/lib/actions/portal";
import { uploadFileFromClient } from "@/lib/client-upload";
import { NEWS_CATEGORY_LABEL } from "@/lib/utils";
import { AdminFormSheet } from "@/components/AdminFormSheet";

type Post = {
  id: string;
  title: string;
  body: string;
  category: string;
  hasDocument: boolean;
  documentUrl: string | null;
  documentName: string | null;
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
  uploadsReady = true,
}: {
  posts: Post[];
  isAdmin: boolean;
  /** False en Vercel si falta BLOB_READ_WRITE_TOKEN. */
  uploadsReady?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [local, setLocal] = useState(posts);
  const [editing, setEditing] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("AVISO");
  const [removeDocument, setRemoveDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    setLocal(posts);
  }, [posts]);

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

  function startEdit(p: Post) {
    setEditing(p);
    setTitle(p.title);
    setBody(p.body);
    setCategory(p.category);
    setRemoveDocument(false);
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("AVISO");
    setRemoveDocument(false);
    setDocumentFile(null);
  }

  const newsForm = (
    <form
      className={
        editing
          ? undefined
          : "mb-6 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:mb-8 sm:p-5"
      }
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setMessage("");
        startTransition(async () => {
          try {
            if (documentFile && documentFile.size > 0) {
              const uploaded = await uploadFileFromClient(documentFile, {
                folder: "uploads",
                kind: "document",
              });
              fd.delete("document");
              fd.set("documentUrl", uploaded.url);
              fd.set("documentName", uploaded.name);
            }
            const res = editing
              ? await updateNewsPost(fd)
              : await createNewsPost(fd);
            if (res.error) {
              setMessage(res.error);
              toast(res.error, "error");
            } else {
              const msg = editing
                ? "Comunicado actualizado."
                : "Comunicado publicado.";
              setMessage(msg);
              toast(msg);
              cancelEdit();
              router.refresh();
            }
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.message
                : "No se pudo subir el archivo. Prueba un PDF o imagen más liviana.";
            setMessage(msg);
            toast(msg, "error");
          }
        });
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl text-primary-dark">
          {editing ? "Editar comunicado" : "Publicar comunicado"}
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
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
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
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Contenido del aviso"
        className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <label className="mt-3 block text-sm text-muted">
        <span className="mb-1.5 block font-medium text-foreground">
          Documento {editing ? "(opcional, reemplaza el actual)" : "(opcional)"}
        </span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp,image/*"
          onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
        />
        <span className="mt-1 block text-xs">
          PDF, Word o imagen · se sube directo (mejor en celular)
        </span>
      </label>
      {editing?.documentUrl && (
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="removeDocument"
            checked={removeDocument}
            onChange={(e) => setRemoveDocument(e.target.checked)}
          />
          Quitar documento actual ({editing.documentName ?? "archivo"})
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {editing ? "Guardar cambios" : "Publicar"}
      </button>
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    </form>
  );

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Comunicados oficiales"
        title="Noticias y Boletines"
        description="Mantente informado sobre los acontecimientos importantes de nuestra comunidad residencial."
      />

      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        {isAdmin && !uploadsReady && (
          <div className="mb-4 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
            <p className="font-semibold text-primary-dark">
              Adjuntos no configurados en producción
            </p>
            <p className="mt-1 text-muted">
              En Vercel → Storage → Blob crea un store, copia{" "}
              <code className="rounded bg-background px-1">BLOB_READ_WRITE_TOKEN</code>{" "}
              a Environment Variables (Production + Preview) y haz Redeploy. Sin
              eso, publicar texto funciona; subir PDF/fotos falla.
            </p>
          </div>
        )}
        {isAdmin &&
          (editing ? (
            <AdminFormSheet open onClose={cancelEdit}>
              {newsForm}
            </AdminFormSheet>
          ) : (
            newsForm
          ))}

        <div className="-mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-8 sm:flex-wrap sm:px-0 sm:pb-0">
          <Filter className="mr-1 h-4 w-4 shrink-0 text-muted" />
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                filter === f
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-muted hover:bg-background"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {items.map((item) => {
            const label = NEWS_CATEGORY_LABEL[item.category] ?? item.category;
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${categoryStyles[label] ?? "bg-primary-soft text-primary"}`}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(item.publishedAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => startEdit(item)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`¿Eliminar “${item.title}”?`)) return;
                            startTransition(async () => {
                              const res = await deleteNewsPost(item.id);
                              if (res.error) toast(res.error, "error");
                              else {
                                toast("Comunicado eliminado.");
                                if (editing?.id === item.id) cancelEdit();
                                router.refresh();
                              }
                            });
                          }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <Link href={`/noticias/${item.id}`} className="group">
                  <h2 className="font-display text-xl uppercase tracking-wide text-primary-dark group-hover:underline">
                    {item.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </Link>
                {item.documentUrl ? (
                  <a
                    href={item.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary hover:bg-primary-soft"
                  >
                    <Paperclip className="h-4 w-4" />
                    {item.documentName || "Documento de consulta"}
                  </a>
                ) : item.hasDocument ? (
                  <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted">
                    <Paperclip className="h-4 w-4" />
                    Documento de consulta
                  </span>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {emojiList.map((emoji) => {
                    const count = item.reactionCounts[emoji] ?? 0;
                    const active = item.myReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(item.id, emoji)}
                        className={`inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-2 text-sm ${
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
