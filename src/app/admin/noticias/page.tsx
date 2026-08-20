import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNewsFeed } from "@/lib/queries";
import { AdminBackLink } from "../admin-back-link";
import { NoticiasClient } from "@/app/noticias/noticias-client";

export default async function AdminNoticiasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const posts = await getNewsFeed(session.user.id);

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
        <AdminBackLink />
      </div>
      <NoticiasClient
        isAdmin
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          category: p.category,
          hasDocument: p.hasDocument,
          documentUrl: p.documentUrl,
          documentName: p.documentName,
          publishedAt: p.publishedAt.toISOString(),
          reactionCounts: p.reactionCounts,
          myReactions: p.myReactions,
        }))}
      />
    </div>
  );
}
