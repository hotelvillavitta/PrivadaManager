import { auth } from "@/lib/auth";
import { getNewsFeed } from "@/lib/queries";
import { redirect } from "next/navigation";
import { NoticiasClient } from "./noticias-client";

export default async function NoticiasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const posts = await getNewsFeed(session.user.id);

  return (
    <NoticiasClient
      isAdmin={session.user.role === "ADMIN"}
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        category: p.category,
        hasDocument: p.hasDocument,
        publishedAt: p.publishedAt.toISOString(),
        reactionCounts: p.reactionCounts,
        myReactions: p.myReactions,
      }))}
    />
  );
}
