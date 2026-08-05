import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.join(process.cwd(), "docs", "content");

export type StaffRoleLike = "RECEPTIONIST" | "ADMIN" | "OWNER";
export type DocAudience = StaffRoleLike | "ALL";
export type DocOutput = "helpCenter" | "faq" | "userGuide" | "adminGuide";

export type DocArticle = {
  slug: string;
  title: string;
  category: string;
  audience: DocAudience[];
  outputs: DocOutput[];
  order: number;
  html: string;
};

marked.setOptions({ gfm: true, breaks: false });

/**
 * Every generated surface (in-app Help Center, product FAQ, and both PDF
 * guides) reads from these same files - there is exactly one place to edit
 * a sentence, so no surface can ever say something the others disagree
 * with. Re-read on every call rather than cached at module scope, so the
 * Help Center always reflects the latest committed content with no build
 * step of its own (the PDFs still need scripts/docs/generate-pdfs.mjs run
 * separately - see docs/content/README for when).
 */
function readAllArticles(): DocArticle[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const slug = String(data.slug ?? file.replace(/\.md$/, ""));

      return {
        slug,
        title: String(data.title ?? slug),
        category: String(data.category ?? "عمومی"),
        audience: (Array.isArray(data.audience) ? data.audience : ["ALL"]) as DocAudience[],
        outputs: (Array.isArray(data.outputs) ? data.outputs : []) as DocOutput[],
        order: Number(data.order ?? 100),
        html: marked.parse(content) as string,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/** OWNER can see everything ADMIN can (same rule as lib/roles.ts's canManageClinic). */
export function canSeeArticle(article: DocArticle, role: StaffRoleLike): boolean {
  if (article.audience.includes("ALL")) return true;
  if (article.audience.includes(role)) return true;
  if (role === "OWNER" && article.audience.includes("ADMIN")) return true;
  return false;
}

export function getHelpArticles(role: StaffRoleLike): DocArticle[] {
  return readAllArticles()
    .filter((a) => a.outputs.includes("helpCenter"))
    .filter((a) => canSeeArticle(a, role));
}

export function getHelpArticleBySlug(slug: string, role: StaffRoleLike): DocArticle | null {
  const article = readAllArticles().find((a) => a.slug === slug && a.outputs.includes("helpCenter"));
  if (!article || !canSeeArticle(article, role)) return null;
  return article;
}

export function getFaqArticles(role: StaffRoleLike): DocArticle[] {
  return readAllArticles()
    .filter((a) => a.outputs.includes("faq"))
    .filter((a) => canSeeArticle(a, role));
}

export function getGuideChapters(guide: "userGuide" | "adminGuide"): DocArticle[] {
  return readAllArticles().filter((a) => a.outputs.includes(guide));
}
