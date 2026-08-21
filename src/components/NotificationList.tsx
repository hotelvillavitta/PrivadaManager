"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Newspaper,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { markNotificationRead } from "@/lib/actions/portal";
import {
  hrefForNotification,
  NOTIFICATION_KIND_LABEL,
  notificationGroupLabel,
  notificationKind,
  relativeTimeEs,
  type NotificationKind,
} from "@/lib/notifications";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  newsId: string | null;
  reservationId: string | null;
  fineId?: string | null;
  issueReportId?: string | null;
  createdAt: string;
};

const KIND_STYLE: Record<
  NotificationKind,
  { wrap: string; icon: typeof Bell }
> = {
  reserva: { wrap: "bg-info-soft text-info", icon: CalendarDays },
  noticia: { wrap: "bg-primary-soft text-primary", icon: Newspaper },
  multa: { wrap: "bg-danger-soft text-danger", icon: ShieldAlert },
  pago: { wrap: "bg-success-soft text-success", icon: Wallet },
  reporte: { wrap: "bg-accent/15 text-accent", icon: ClipboardList },
  general: { wrap: "bg-warning-soft text-warning", icon: Bell },
};

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = notificationGroupLabel(item.createdAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-background/70 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Bell className="h-7 w-7" />
        </div>
        <p className="font-display text-2xl text-primary-dark">Bandeja en calma</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Cuando haya un aviso, una reserva, un cobro o una multa, aparecerá
          aquí para tu casa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {groups.map(([label, group]) => (
        <section key={label}>
          <h2 className="mb-3 px-1 text-xs font-bold tracking-[0.14em] text-muted uppercase">
            {label}
          </h2>
          <ul className="space-y-2.5">
            {group.map((n) => {
              const href = hrefForNotification(n);
              const kind = notificationKind(n);
              const style = KIND_STYLE[kind];
              const Icon = style.icon;
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
                    className={`group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 sm:gap-4 sm:px-4 ${
                      n.read
                        ? "border-border bg-surface"
                        : "border-primary/25 bg-unread-soft shadow-[inset_4px_0_0_0_var(--unread)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.wrap}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">
                            {NOTIFICATION_KIND_LABEL[kind]}
                          </span>
                          {!n.read ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                              Nueva
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-accent">
                          {relativeTimeEs(n.createdAt)}
                        </span>
                      </span>
                      <span
                        className={`block leading-snug ${
                          n.read
                            ? "font-medium text-foreground"
                            : "font-semibold text-primary-dark"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="mt-1 line-clamp-3 block text-sm leading-relaxed text-muted">
                        {n.body}
                      </span>
                    </span>
                    {href ? (
                      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-border transition group-hover:text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
