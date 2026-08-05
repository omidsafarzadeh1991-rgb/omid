/**
 * Maintainer-only script: regenerates public/docs/user-guide.pdf and
 * admin-guide.pdf from docs/content/*.md - the exact same source the
 * in-app Help Center and FAQ read from, so the PDFs can never say
 * something the app's Help Center disagrees with.
 *
 * Not part of the running app and never added to package.json - Playwright
 * (a full Chromium, needed because pure-JS PDF libraries render Persian
 * text with broken letter joining) and pdf-lib are installed temporarily:
 *
 *   npm install --no-save playwright pdf-lib
 *   npx playwright install chromium   # first run only
 *   npx tsx scripts/docs/generate-pdfs.ts
 *   npm uninstall playwright pdf-lib
 *
 * Re-run this (and commit the resulting PDFs) whenever docs/content changes.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CONTENT_DIR = path.join(ROOT, "docs", "content");
const OUTPUT_DIR = path.join(ROOT, "public", "docs");
const TMP_DIR = path.join(ROOT, ".docs-pdf-tmp");

type Article = {
  slug: string;
  title: string;
  outputs: string[];
  order: number;
  html: string;
};

// Deliberately not importing lib/docs.ts: that file starts with
// `import "server-only"`, which throws outside Next.js's server-component
// bundling condition (plain Node resolves it to a module that always
// throws). Re-reading the same docs/content/*.md files here directly is a
// few lines of harmless duplication rather than fighting that resolution.
function readArticles(): Article[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      return {
        slug: String(data.slug ?? file.replace(/\.md$/, "")),
        title: String(data.title ?? file),
        outputs: (Array.isArray(data.outputs) ? data.outputs : []) as string[],
        order: Number(data.order ?? 100),
        html: marked.parse(content) as string,
      };
    })
    .sort((a, b) => a.order - b.order);
}

const FONT_PATH = path.join(
  ROOT,
  "node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2"
);
const FONT_BASE64 = fs.readFileSync(FONT_PATH).toString("base64");

const PAGE_CSS = `
  @font-face {
    font-family: "Vazirmatn";
    src: url(data:font/woff2;base64,${FONT_BASE64}) format("woff2-variations");
    font-weight: 100 900;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    direction: rtl;
    font-family: "Vazirmatn", Tahoma, sans-serif;
    color: #10192b;
    line-height: 1.9;
  }
  h1 { font-size: 20px; font-weight: 800; margin: 0 0 18px; color: #075a50; }
  h2 { font-size: 15px; font-weight: 700; margin: 22px 0 10px; }
  p { margin: 0 0 12px; font-size: 12.5px; }
  ul, ol { margin: 0 0 12px; padding-inline-start: 20px; }
  li { margin-bottom: 6px; font-size: 12.5px; }
  strong { color: #075a50; }
  code { direction: ltr; unicode-bidi: isolate; background: #eef1f4; border-radius: 3px; padding: 1px 5px; }
  .chapter { break-before: page; }
  .chapter:first-child { break-before: avoid; }
`;

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}</style></head><body>${bodyHtml}</body></html>`;
}

async function renderPdf(playwrightChromium: import("playwright").BrowserType, html: string, outPath: string) {
  const browser = await playwrightChromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
  );
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outPath,
      format: "A4",
      margin: { top: "20mm", bottom: "18mm", left: "18mm", right: "18mm" },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

async function pageCount(PDFDocument: typeof import("pdf-lib").PDFDocument, filePath: string): Promise<number> {
  const bytes = fs.readFileSync(filePath);
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

function coverHtml(title: string, subtitle: string): string {
  return wrapHtml(`
    <div style="height:257mm; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
      <div style="width:64px; height:64px; border-radius:16px; background:linear-gradient(135deg,#2dd4bf,#0e7a6d); margin-bottom:28px;"></div>
      <h1 style="font-size:28px; margin-bottom:10px;">${title}</h1>
      <p style="font-size:14px; color:#46536b;">${subtitle}</p>
      <p style="font-size:11px; color:#7c879b; margin-top:60px;">سامانهٔ نوبت‌دهی هوشمند کلینیک</p>
    </div>
  `);
}

function tocHtml(entries: { title: string; page: number | null }[]): string {
  const rows = entries
    .map(
      (e) => `
      <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px dotted #cbd5e1; padding:7px 0; font-size:12.5px;">
        <span>${e.title}</span>
        <span dir="ltr" style="color:#075a50; font-weight:700;">${e.page ?? "-"}</span>
      </div>`
    )
    .join("");
  return wrapHtml(`<h1>فهرست مطالب</h1>${rows}`);
}

async function buildGuide(
  playwright: typeof import("playwright"),
  pdfLib: typeof import("pdf-lib"),
  guideOutput: "userGuide" | "adminGuide",
  title: string,
  subtitle: string,
  outFile: string
) {
  const chapters = readArticles().filter((a) => a.outputs.includes(guideOutput));
  if (chapters.length === 0) {
    throw new Error(`No chapters tagged for ${guideOutput} - refusing to generate an empty guide.`);
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });

  // Pass 1: render every chapter alone (identical CSS/margins as the final
  // combined render) purely to learn how many pages it occupies, so we can
  // compute the real starting page of every chapter without ever having to
  // search extracted PDF text.
  const chapterPageCounts: number[] = [];
  for (const chapter of chapters) {
    const chapterPath = path.join(TMP_DIR, `chapter-${chapter.slug}.pdf`);
    await renderPdf(playwright.chromium, wrapHtml(`<div class="chapter"><h1>${chapter.title}</h1>${chapter.html}</div>`), chapterPath);
    chapterPageCounts.push(await pageCount(pdfLib.PDFDocument, chapterPath));
  }

  const combinedHtml = wrapHtml(
    chapters.map((c) => `<div class="chapter"><h1>${c.title}</h1>${c.html}</div>`).join("")
  );
  const contentPath = path.join(TMP_DIR, "content.pdf");
  await renderPdf(playwright.chromium, combinedHtml, contentPath);
  const contentPageTotal = await pageCount(pdfLib.PDFDocument, contentPath);
  const expectedTotal = chapterPageCounts.reduce((a, b) => a + b, 0);
  if (contentPageTotal !== expectedTotal) {
    throw new Error(
      `Page-count mismatch for ${guideOutput}: combined render has ${contentPageTotal} pages but per-chapter renders summed to ${expectedTotal}. Refusing to generate a guide with an inaccurate table of contents.`
    );
  }

  const startPage: number[] = [];
  let cursor = 1;
  for (const count of chapterPageCounts) {
    startPage.push(cursor);
    cursor += count;
  }

  // Pass 2a: a preliminary TOC (numbers not known yet) just to learn how
  // many pages the cover+TOC themselves occupy.
  const prelimEntries = chapters.map((c) => ({ title: c.title, page: null }));
  const coverPath = path.join(TMP_DIR, "cover.pdf");
  await renderPdf(playwright.chromium, coverHtml(title, subtitle), coverPath);
  const prelimTocPath = path.join(TMP_DIR, "toc-prelim.pdf");
  await renderPdf(playwright.chromium, tocHtml(prelimEntries), prelimTocPath);
  const frontMatterPageCount =
    (await pageCount(pdfLib.PDFDocument, coverPath)) + (await pageCount(pdfLib.PDFDocument, prelimTocPath));

  // Pass 2b: the real TOC, now with real final page numbers.
  const finalEntries = chapters.map((c, i) => ({
    title: c.title,
    page: startPage[i] + frontMatterPageCount,
  }));
  const finalTocPath = path.join(TMP_DIR, "toc-final.pdf");
  await renderPdf(playwright.chromium, tocHtml(finalEntries), finalTocPath);

  // Merge cover + final TOC + content, then stamp running page numbers on
  // every page after the cover (plain digits only - no Persian shaping
  // risk, so pdf-lib's built-in font is fine for this part).
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const finalDoc = await PDFDocument.create();
  const font = await finalDoc.embedFont(StandardFonts.Helvetica);

  for (const src of [coverPath, finalTocPath, contentPath]) {
    const srcDoc = await PDFDocument.load(fs.readFileSync(src));
    const copied = await finalDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copied.forEach((p: import("pdf-lib").PDFPage) => finalDoc.addPage(p));
  }

  const pages = finalDoc.getPages();
  for (let i = 1; i < pages.length; i++) {
    const pageNumber = i + 1; // page index 0 (the cover) is left unnumbered; page index i is physical page i+1
    const label = String(pageNumber);
    const width = font.widthOfTextAtSize(label, 9);
    pages[i].drawText(label, {
      x: pages[i].getWidth() / 2 - width / 2,
      y: 24,
      size: 9,
      font,
      color: rgb(0.29, 0.33, 0.42),
    });
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, outFile), await finalDoc.save());
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`✓ ${outFile}: ${pages.length} صفحه (${chapters.length} فصل)`);
}

async function main() {
  const playwright = await import("playwright");
  const pdfLib = await import("pdf-lib");

  await buildGuide(
    playwright,
    pdfLib,
    "userGuide",
    "راهنمای کاربر",
    "برای منشی‌ها و کارمندان کلینیک — ثبت نوبت، لیست انتظار و مکالمات",
    "user-guide.pdf"
  );
  await buildGuide(
    playwright,
    pdfLib,
    "adminGuide",
    "راهنمای مدیر",
    "برای مدیر کلینیک و مالک سامانه — پزشکان، کارمندان، بات‌ها و امنیت",
    "admin-guide.pdf"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
