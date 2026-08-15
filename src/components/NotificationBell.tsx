"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationRead } from "@/lib/actions/portal";
import {
  hrefForNotification,
  relativeTimeEs,
} from "@/lib/notifications";

export type NavNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  newsId: string | null;
  reservationId: string | null;
  createdAt: string;
};

export function NotificationBell({
  unread,
  items,
}: {
  unread: number;
  items: NavNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(n: NavNotification) {
    const href = hrefForNotification(n);
    startTransition(async () => {
      await markNotificationRead(n.id);
      setOpen(false);
      if (href) router.push(href);
      else router.refresh();
    });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2.5 text-primary-dark transition hover:bg-primary-soft"
      >
        <Bell className="h-5 w-5" strokeWidth={2.25} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Últimas notificaciones"
          className="fixed inset-x-3 top-[4.25rem] z-50 max-h-[calc(100dvh-10rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_-20px_rgba(47,29,45,0.45)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] sm:max-h-none"
        >
          <div className="flex items-center justify-between border-b border-border bg-primary-soft/70 px-4 py-3">
            <p className="text-sm font-semibold text-primary-dark">
              Notificaciones
            </p>
            {unread > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                {unread} nuevas
              </span>
            ) : (
              <span className="text-[11px] text-muted">Al día</span>
            )}
          </div>

          <ul className="max-h-[calc(100dvh-17rem)] overflow-y-auto overscroll-contain sm:max-h-[22rem]">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">
                No tienes notificaciones.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-background disabled:opacity-60 ${
                      n.read ? "bg-surface" : "bg-unread-soft"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        n.read ? "bg-border" : "bg-unread ring-2 ring-primary/20"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          n.read
                            ? "font-medium text-foreground"
                            : "font-semibold text-primary-dark"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-accent">
                        {relativeTimeEs(n.createdAt)}
                        {!n.read ? " · Sin leer" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-border bg-background px-3 py-2.5">
            <Link
              href="/comunidad"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary-soft"
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
