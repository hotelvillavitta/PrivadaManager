import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { adminGuide } from "@/lib/admin-guide";
import { AdminBackLink } from "../admin-back-link";

export default async function AdminGuidePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Guía de la app"
        description="Para qué sirve cada sección y qué pasa cuando se registra un movimiento."
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 lg:px-6">
        <AdminBackLink />

        <nav className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">
            Contenido
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {adminGuide.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-primary-dark hover:bg-primary-soft"
                >
                  <span className="text-muted">{index + 1}.</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {adminGuide.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
          >
            <h2 className="font-display text-2xl text-primary-dark">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              {section.summary}
            </p>

            {section.points ? (
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-primary-dark">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {section.actions ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                {section.actions.map((row) => (
                  <div
                    key={row.action}
                    className="border-t border-border px-3 py-3 first:border-t-0 sm:px-4"
                  >
                    <p className="text-sm font-semibold text-primary-dark">
                      {row.action}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {row.effect}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ))}

        <p className="text-center text-sm text-muted">
          <Link href="/admin" className="font-semibold text-primary hover:underline">
            Volver al panel
          </Link>
        </p>
      </div>
    </div>
  );
}
