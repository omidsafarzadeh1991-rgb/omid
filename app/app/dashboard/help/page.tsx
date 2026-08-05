import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import { getHelpArticles, getFaqArticles } from "@/lib/docs";

export default async function HelpCenterPage() {
  const session = await requireSession();
  const isAdmin = canManageClinic(session.role);

  const articles = getHelpArticles(session.role);
  const faqItems = getFaqArticles(session.role);

  const categories = new Map<string, typeof articles>();
  for (const article of articles) {
    const list = categories.get(article.category) ?? [];
    list.push(article);
    categories.set(article.category, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <p className="eyebrow mb-1">راهنما</p>
        <h1 className="text-xl font-bold text-slate-900">راهنمای استفاده از نرم‌افزار</h1>
        <p className="mt-1 text-sm text-slate-500">
          راهنمای مرحله‌به‌مرحلهٔ همهٔ بخش‌های پنل، بر اساس نقش شما.
        </p>
      </div>

      <section className="surface animate-in flex flex-wrap gap-3 p-6">
        <a href="/docs/user-guide.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          دانلود راهنمای کاربر (PDF)
        </a>
        {isAdmin && (
          <a href="/docs/admin-guide.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            دانلود راهنمای مدیر (PDF)
          </a>
        )}
      </section>

      {Array.from(categories.entries()).map(([category, items]) => (
        <section key={category} className="surface animate-in p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">{category}</h2>
          <ul className="space-y-2">
            {items.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/dashboard/help/${article.slug}`}
                  className="block rounded-lg px-3 py-2 text-sm text-teal-700 transition-colors hover:bg-teal-50"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {faqItems.length > 0 && (
        <section className="surface animate-in p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">سوالات متداول</h2>
          <div className="space-y-2">
            {faqItems.map((item) => (
              <details key={item.slug} className="rounded-lg border border-slate-100 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  {item.title}
                </summary>
                <div
                  className="doc-content mt-3 text-sm text-slate-600"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
