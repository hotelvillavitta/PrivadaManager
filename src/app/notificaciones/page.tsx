import { Bell, CheckCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/NotificationList";
import { auth } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/actions/portal";
import { getNotifications } from "@/lib/queries";

export default async function NotificacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await getNotifications(session.user.id);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="pb-16">
      <section className="mx-auto max-w-3xl px-4 pb-6 pt-8 sm:pt-10 lg:px-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="relative bg-gradient-to-br from-primary via-primary-dark to-[#1a1018] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute bottom-0 right-10 h-24 w-24 rounded-full bg-accent/30" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Bell className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">
                  Tu bandeja
                </p>
                <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                  Notificaciones
                </h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
                  Avisos, cobros, reservas y multas de tu casa. Toca una para
                  abrir el detalle.
                </p>
              </div>
            </div>

            <div className="relative mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/15">
                {unread === 0
                  ? "Todo al día"
                  : `${unread} sin leer`}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/10">
                {notifications.length} en total
              </span>
              {unread > 0 ? (
                <form action={markNotificationsRead} className="ml-auto">
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-dark shadow-sm"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Marcar leídas
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <NotificationList
          items={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            read: n.read,
            newsId: n.newsId,
            reservationId: n.reservationId,
            fineId: n.fineId,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
