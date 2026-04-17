import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const siteBaseUrl = "https://nyh-art.com";
const defaultGalleryDataUrl = "https://img.nyh-art.com/site-data/gallery.json";
const defaultOgImage = "https://img.nyh-art.com/ocean/2023-10-03-Cx7axmaOa1e.jpg";

const filesToCopy = [
  "index.html",
  "gallery.html",
  "styles.css",
  "locale-data.js",
  "script.js"
];

const directoriesToCopy = [
  "assets"
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

async function loadGalleryData() {
  try {
    const response = await fetch(defaultGalleryDataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const localDataPath = path.join(rootDir, "data", "gallery.json");
    const localData = await readFile(localDataPath, "utf8");
    console.warn(`Falling back to local gallery data: ${error.message}`);
    return JSON.parse(localData);
  }
}

function updateMetaTag(html, matcher, replacement) {
  return html.replace(matcher, replacement);
}

function buildSeriesPageHtml(template, gallery) {
  const pageTitle = `${gallery.title} | NYH's Artwork`;
  const pageDescription =
    gallery.description ||
    "흘러가는 순간을 그림으로 붙잡아 모아둔 NYH의 온라인 갤러리";
  const pageUrl = `${siteBaseUrl}/series/${gallery.slug}/`;
  const pageImage = gallery.artworks?.[0]?.imageUrl || defaultOgImage;

  let html = template;

  html = updateMetaTag(
    html,
    /<title>[\s\S]*?<\/title>/u,
    `<title>${escapeHtml(pageTitle)}</title>`
  );
  html = updateMetaTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/u,
    `<meta name="description" content="${escapeAttribute(pageDescription)}" />`
  );
  html = updateMetaTag(
    html,
    /<link rel="canonical" href="[^"]*" \/>/u,
    `<link rel="canonical" href="${escapeAttribute(pageUrl)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+property="og:title"[\s\S]*?\/>/u,
    `<meta property="og:title" content="${escapeAttribute(pageTitle)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/u,
    `<meta property="og:description" content="${escapeAttribute(pageDescription)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta property="og:url" content="[^"]*" \/>/u,
    `<meta property="og:url" content="${escapeAttribute(pageUrl)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+property="og:image"[\s\S]*?\/>/u,
    `<meta property="og:image" content="${escapeAttribute(pageImage)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+name="twitter:title"[\s\S]*?\/>/u,
    `<meta name="twitter:title" content="${escapeAttribute(pageTitle)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+name="twitter:description"[\s\S]*?\/>/u,
    `<meta name="twitter:description" content="${escapeAttribute(pageDescription)}" />`
  );
  html = updateMetaTag(
    html,
    /<meta\s+name="twitter:image"[\s\S]*?\/>/u,
    `<meta name="twitter:image" content="${escapeAttribute(pageImage)}" />`
  );
  html = updateMetaTag(
    html,
    /<body[\s\S]*?>/u,
    `<body
    data-gallery-url="${escapeAttribute(defaultGalleryDataUrl)}"
    data-home-url="../../index.html"
    data-gallery-index-url="../../gallery.html"
    data-series-base-url=".."
    data-selected-series="${escapeAttribute(gallery.slug)}"
  >`
  );
  html = updateMetaTag(
    html,
    /<link rel="stylesheet" href="styles\.css" \/>/u,
    `<link rel="stylesheet" href="../../styles.css" />`
  );
  html = updateMetaTag(
    html,
    /<script src="locale-data\.js"><\/script>/u,
    `<script src="../../locale-data.js"></script>`
  );
  html = updateMetaTag(
    html,
    /<script src="script\.js"><\/script>/u,
    `<script src="../../script.js"></script>`
  );
  html = updateMetaTag(
    html,
    /src="assets\/profile\.jpg"/gu,
    `src="../../assets/profile.jpg"`
  );
  html = updateMetaTag(
    html,
    /href="index\.html"/gu,
    `href="../../index.html"`
  );
  html = updateMetaTag(
    html,
    /href="index\.html#about"/gu,
    `href="../../index.html#about"`
  );
  html = updateMetaTag(
    html,
    /href="index\.html#notes"/gu,
    `href="../../index.html#notes"`
  );
  html = updateMetaTag(
    html,
    /href="gallery\.html"/gu,
    `href="../../gallery.html"`
  );
  html = updateMetaTag(
    html,
    /<p class="eyebrow">전체 아카이브<\/p>/u,
    `<p class="eyebrow">시리즈</p>`
  );
  html = updateMetaTag(
    html,
    /<h1>어디론가 흘러가는 중\.🌙<\/h1>/u,
    `<h1>${escapeHtml(gallery.title)}</h1>`
  );
  html = updateMetaTag(
    html,
    /<p id="gallery-summary" class="page-hero-body">[\s\S]*?<\/p>/u,
    `<p id="gallery-summary" class="page-hero-body">${escapeHtml(pageDescription)}</p>`
  );

  return html;
}

function buildSitemapXml(galleries) {
  const urls = [
    `${siteBaseUrl}/`,
    `${siteBaseUrl}/gallery.html`,
    ...galleries.map((gallery) => `${siteBaseUrl}/series/${gallery.slug}/`)
  ];

  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

const galleryData = await loadGalleryData();
const galleries = Array.isArray(galleryData.galleries) ? galleryData.galleries : [];
const galleryTemplate = await readFile(path.join(rootDir, "gallery.html"), "utf8");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const file of filesToCopy) {
  await cp(path.join(rootDir, file), path.join(distDir, file));
}

for (const directory of directoriesToCopy) {
  await cp(path.join(rootDir, directory), path.join(distDir, directory), {
    recursive: true
  });
}

for (const gallery of galleries) {
  const seriesDir = path.join(distDir, "series", gallery.slug);
  await mkdir(seriesDir, { recursive: true });
  const seriesHtml = buildSeriesPageHtml(galleryTemplate, gallery);
  await writeFile(path.join(seriesDir, "index.html"), seriesHtml, "utf8");
}

await writeFile(path.join(distDir, "sitemap.xml"), buildSitemapXml(galleries), "utf8");

console.log(`Built deployable site into dist/ with ${galleries.length} series pages.`);
