import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNewsFeed } from "@/lib/queries";
import { NoticiasClient } from "./noticias-client";

export default async function NoticiasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const posts = await getNewsFeed(session.user.id);

  return (
    <NoticiasClient
      isAdmin={false}
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
  );
}
