import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  MessageSquare,
  Newspaper,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/NotificationList";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/actions/portal";
import { getNotifications } from "@/lib/queries";
import { fullName } from "@/lib/utils";

export default async function ComunidadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const notifications = await getNotifications(user.id);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow={`Bienvenido, ${user.firstName}`}
        title="Red de Vecinos"
        description="Conecta con tu comunidad, comparte avisos y participa en las conversaciones."
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="mb-10 flex items-center gap-4 rounded-2xl border border-border bg-primary-soft/60 px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-primary-dark">
              ¡Hola, {fullName(user).toUpperCase()}!
            </p>
            <p className="text-sm text-muted">
              Tu rol actual:{" "}
              <span className="font-medium text-primary">
                {user.role === "ADMIN" ? "Administrador" : "Colono"}
              </span>
            </p>
          </div>
        </div>

        <div className="mb-10 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Publicaciones",
              description: "Avisos y novedades de la privada.",
              icon: MessageSquare,
              href: "/noticias",
            },
            {
              title: "Directorio",
              description: "Contactos y proveedores recomendados.",
              icon: Users,
              href: "/directorio",
            },
            {
              title: "Reservaciones",
              description: "Agenda la palapa para tus eventos.",
              icon: CalendarDays,
              href: "/reservaciones",
            },
          ].map(({ title, description, icon: Icon, href }) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl text-primary-dark">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-2xl text-primary-dark">
              <Bell className="h-5 w-5 text-primary" />
              Notificaciones
            </h2>
            <form action={markNotificationsRead}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-background"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar leídas
              </button>
            </form>
          </div>

          <NotificationList
            items={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              read: n.read,
              newsId: n.newsId,
              reservationId: n.reservationId,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
        </section>

        <div className="mt-6">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Newspaper className="h-4 w-4" />
            Ver noticias y boletines
          </Link>
        </div>
      </div>
    </div>
  );
}
