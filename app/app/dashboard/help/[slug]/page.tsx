import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getHelpArticleBySlug } from "@/lib/docs";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;

  const article = getHelpArticleBySlug(slug, session.role);
  if (!article) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="animate-in">
        <Link href="/dashboard/help" className="btn-ghost -mr-2 mb-2 inline-flex">
          ← بازگشت به راهنما
        </Link>
        <p className="eyebrow mb-1">{article.category}</p>
        <h1 className="text-2xl font-bold text-slate-900">{article.title}</h1>
      </div>

      <div className="surface animate-in p-6 sm:p-8">
        <div className="doc-content" dangerouslySetInnerHTML={{ __html: article.html }} />
      </div>
    </main>
  );
}
