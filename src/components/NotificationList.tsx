"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/portal";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  newsId: string | null;
  reservationId: string | null;
  createdAt: string;
};

function hrefFor(n: Item) {
  if (n.reservationId) {
    return `/reservaciones?solicitud=${n.reservationId}`;
  }
  if (n.newsId) return `/noticias/${n.newsId}`;
  const t = n.title.toLowerCase();
  if (t.includes("cuota") || t.includes("pago")) return "/cuotas";
  if (t.includes("reserv") || t.includes("palapa")) return "/reservaciones";
  return null;
}

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted">No tienes notificaciones.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((n) => {
        const href = hrefFor(n);
        return (
          <li key={n.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await markNotificationRead(n.id);
                  if (href) router.push(href);
                  else router.refresh();
                });
              }}
              className={`block w-full rounded-xl border px-4 py-3 text-left transition hover:border-primary/40 disabled:opacity-60 ${
                n.read
                  ? "border-border bg-background"
                  : "border-primary/20 bg-primary-soft/50"
              }`}
            >
              <p className="font-medium text-primary-dark">{n.title}</p>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
              <p className="mt-2 text-xs text-muted">
                {new Date(n.createdAt).toLocaleString("es-MX")}
                {!n.read ? " · Sin leer" : ""}
                {href ? " · Abrir" : ""}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
