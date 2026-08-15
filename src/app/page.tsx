import Link from "next/link";
import { Bell, MessageSquare, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { fullName } from "@/lib/utils";
import { redirect } from "next/navigation";

const features = [
  {
    title: "Publicaciones",
    description: "Comparte avisos y novedades con tus vecinos.",
    icon: MessageSquare,
    href: "/noticias",
  },
  {
    title: "Directorio",
    description: "Conoce a los miembros de tu comunidad.",
    icon: Users,
    href: "/directorio",
  },
  {
    title: "Notificaciones",
    description: "Recibe alertas de actividad importante.",
    icon: Bell,
    href: "/comunidad",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pb-6 pt-14 text-center lg:px-6 lg:pt-20">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Bienvenido, {user.firstName}
        </p>
        <h1 className="font-display text-4xl text-primary-dark sm:text-5xl">
          Red de Vecinos
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Conecta con tu comunidad, comparte avisos y participa en las
          conversaciones.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
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
              {user.houseNumber ? ` · Casa #${user.houseNumber}` : null}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 lg:px-6">
        <h2 className="mb-6 text-center font-display text-2xl text-primary-dark">
          Funcionalidades Disponibles
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map(({ title, description, icon: Icon, href }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <h3 className="font-display text-xl text-primary-dark">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {description}
              </p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-accent uppercase">
                Explorar
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
