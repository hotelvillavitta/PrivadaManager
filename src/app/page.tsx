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
    href: "/notificaciones",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pb-5 pt-8 text-center sm:pt-12 lg:px-6 lg:pt-16">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Bienvenido, {user.firstName}
        </p>
        <h1 className="font-display text-3xl text-primary-dark sm:text-4xl lg:text-5xl">
          Red de Vecinos
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mt-4 sm:text-base lg:text-lg">
          Conecta con tu comunidad, comparte avisos y participa en las
          conversaciones.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-sm sm:gap-4 sm:px-5 sm:py-4">
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
            {user.role === "ADMIN" ? (
              <p className="mt-1 text-sm">
                <Link
                  href="/admin"
                  className="font-semibold text-primary hover:underline"
                >
                  Abrir panel de administración →
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10 lg:px-6 lg:py-12">
        <h2 className="mb-6 text-center font-display text-2xl text-primary-dark">
          Funcionalidades Disponibles
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          {features.map(({ title, description, icon: Icon, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:block sm:p-6 sm:text-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white sm:mx-auto sm:mb-4">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div>
                <h3 className="font-display text-lg text-primary-dark sm:text-xl">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted sm:mt-2">
                  {description}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-wide text-accent uppercase sm:mt-4">
                  Explorar
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
