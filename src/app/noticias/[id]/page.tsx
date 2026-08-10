import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markNewsAsRead } from "@/lib/actions/portal";
import { NEWS_CATEGORY_LABEL } from "@/lib/utils";

export default async function NoticiaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const post = await prisma.newsPost.findUnique({ where: { id } });
  if (!post) notFound();

  await markNewsAsRead(id);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow={NEWS_CATEGORY_LABEL[post.category] ?? post.category}
        title={post.title}
        description={new Date(post.publishedAt).toLocaleString("es-MX")}
      />
      <div className="mx-auto max-w-3xl space-y-6 px-4 lg:px-6">
        <Link
          href="/noticias"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a noticias
        </Link>
        <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="whitespace-pre-wrap text-foreground leading-relaxed">
            {post.body}
          </p>
          {post.documentUrl && (
            <a
              href={post.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-background"
            >
              <FileText className="h-4 w-4" />
              {post.documentName ?? "Ver documento"}
            </a>
          )}
        </article>
      </div>
    </div>
  );
}
