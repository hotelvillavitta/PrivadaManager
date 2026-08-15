"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/portal";
import {
  hrefForNotification,
  relativeTimeEs,
} from "@/lib/notifications";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  newsId: string | null;
  reservationId: string | null;
  fineId?: string | null;
  createdAt: string;
};

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted">No tienes notificaciones.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((n) => {
        const href = hrefForNotification(n);
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
              className={`relative block w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition hover:shadow-sm disabled:opacity-60 ${
                n.read
                  ? "border-border bg-surface text-foreground"
                  : "border-primary/35 bg-unread-soft shadow-[inset_4px_0_0_0_var(--unread)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    n.read ? "bg-border" : "bg-unread"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`leading-snug ${
                      n.read
                        ? "font-medium text-foreground"
                        : "font-semibold text-primary-dark"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs font-medium text-accent">
                    {relativeTimeEs(n.createdAt)}
                    {!n.read ? " · Sin leer" : " · Leída"}
                    {href ? " · Abrir" : ""}
                  </p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
