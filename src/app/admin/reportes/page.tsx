import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { getAllIssueReports } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { ReportesAdminClient } from "./reportes-admin-client";

export default async function AdminReportesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const reports = await getAllIssueReports();

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Administración"
        title="Reportes de desperfectos"
        description="Revisa, actualiza el estado y responde a los vecinos."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 lg:px-6">
        <AdminBackLink />
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <ReportesAdminClient
            reports={reports.map((r) => ({
              id: r.id,
              title: r.title,
              description: r.description,
              category: r.category,
              location: r.location,
              status: r.status,
              houseNumber: r.houseNumber,
              adminNotes: r.adminNotes,
              createdAt: r.createdAt.toISOString(),
              resolvedAt: r.resolvedAt?.toISOString() ?? null,
              photos: r.photos.map((p) => ({
                id: p.id,
                url: p.url,
                name: p.name,
              })),
              reporter: r.reporter,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
