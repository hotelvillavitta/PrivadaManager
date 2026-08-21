import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIssueReportsForUser } from "@/lib/queries";
import { isDocumentUploadConfigured } from "@/lib/uploads";
import { ReportesClient } from "./reportes-client";

export default async function ReportesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reports = await getIssueReportsForUser(session.user.id);

  return (
    <ReportesClient
      houseNumber={session.user.houseNumber}
      uploadsReady={isDocumentUploadConfigured()}
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
      }))}
    />
  );
}
