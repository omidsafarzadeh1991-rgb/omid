import { describe, expect, it } from "vitest";
import {
  canSeeArticle,
  getFaqArticles,
  getGuideChapters,
  getHelpArticleBySlug,
  getHelpArticles,
  type DocArticle,
} from "@/lib/docs";

describe("docs content model", () => {
  it("shows an ALL-audience article to every role", () => {
    const articles = getHelpArticles("RECEPTIONIST");
    expect(articles.some((a) => a.slug === "getting-started")).toBe(true);
  });

  it("hides ADMIN-only articles from a receptionist", () => {
    const articles = getHelpArticles("RECEPTIONIST");
    expect(articles.some((a) => a.slug === "doctors-catalog")).toBe(false);
  });

  it("shows ADMIN-only articles to an admin", () => {
    const articles = getHelpArticles("ADMIN");
    expect(articles.some((a) => a.slug === "doctors-catalog")).toBe(true);
  });

  it("lets OWNER see ADMIN-audience articles too (same rule as canManageClinic)", () => {
    const articles = getHelpArticles("OWNER");
    expect(articles.some((a) => a.slug === "doctors-catalog")).toBe(true);
  });

  it("hides OWNER-only articles from ADMIN", () => {
    const adminArticles = getHelpArticles("ADMIN");
    const ownerArticles = getHelpArticles("OWNER");
    expect(adminArticles.some((a) => a.slug === "security-backup")).toBe(false);
    expect(ownerArticles.some((a) => a.slug === "security-backup")).toBe(true);
  });

  it("only returns articles explicitly tagged for the helpCenter output", () => {
    const articles = getHelpArticles("OWNER");
    expect(articles.some((a) => a.slug === "faq-ai-cost")).toBe(false);
  });

  it("returns a help article by slug only when the role is allowed to see it", () => {
    expect(getHelpArticleBySlug("security-backup", "OWNER")?.slug).toBe("security-backup");
    expect(getHelpArticleBySlug("security-backup", "ADMIN")).toBeNull();
    expect(getHelpArticleBySlug("does-not-exist", "OWNER")).toBeNull();
  });

  it("returns product FAQ entries, distinct from the help articles", () => {
    const faq = getFaqArticles("RECEPTIONIST");
    expect(faq.some((a) => a.slug === "faq-double-booking")).toBe(true);
    expect(faq.every((a) => a.outputs.includes("faq"))).toBe(true);
  });

  it("filters guide chapters by the requested PDF output", () => {
    const userGuide = getGuideChapters("userGuide");
    const adminGuide = getGuideChapters("adminGuide");
    expect(userGuide.some((a) => a.slug === "booking-appointments")).toBe(true);
    expect(userGuide.some((a) => a.slug === "security-backup")).toBe(false);
    expect(adminGuide.some((a) => a.slug === "security-backup")).toBe(true);
  });

  it("canSeeArticle: OWNER inherits ADMIN visibility but not the reverse", () => {
    const adminOnly: DocArticle = {
      slug: "x",
      title: "x",
      category: "x",
      audience: ["ADMIN"],
      outputs: ["helpCenter"],
      order: 1,
      html: "",
    };
    expect(canSeeArticle(adminOnly, "OWNER")).toBe(true);
    expect(canSeeArticle(adminOnly, "ADMIN")).toBe(true);
    expect(canSeeArticle(adminOnly, "RECEPTIONIST")).toBe(false);
  });
});
