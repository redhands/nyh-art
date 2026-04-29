import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const siteBaseUrl = "https://nyh-art.com";
const defaultGalleryDataUrl = "https://img.nyh-art.com/site-data/gallery.json";
const defaultOgImage = "https://img.nyh-art.com/ocean/2023-10-03-Cx7axmaOa1e.jpg";
const supportedLocales = ["ko", "en", "ja", "zh"];
const assetVersion = new Date().toISOString().replaceAll(/[-:.TZ]/g, "");
const ogLocaleMap = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_TW"
};

const filesToCopy = [
  "index.html",
  "gallery.html",
  "styles.css",
  "locale-data.js",
  "script.js"
];

const directoriesToCopy = [
  "assets",
  "js"
];

function selectSampleArtworks(artworks, targetCount) {
  if (!Array.isArray(artworks) || artworks.length <= targetCount) {
    return Array.isArray(artworks) ? artworks : [];
  }

  const selected = [];
  const usedIndices = new Set();

  for (let slot = 0; slot < targetCount; slot += 1) {
    const index = Math.round((slot * (artworks.length - 1)) / Math.max(1, targetCount - 1));
    if (usedIndices.has(index)) continue;
    usedIndices.add(index);
    selected.push(artworks[index]);
  }

  return selected;
}

function buildHomeGalleryData(galleryData) {
  const galleries = Array.isArray(galleryData.galleries) ? galleryData.galleries : [];

  return {
    generatedAt: galleryData.generatedAt,
    total: galleryData.total,
    galleries: galleries.map((gallery) => ({
      ...gallery,
      artworks: gallery.showInArchive === false
        ? []
        : selectSampleArtworks(gallery.artworks || [], gallery.thumbnailSize === "icon" ? 8 : 4)
    }))
  };
}

function buildSeriesGalleryData(galleryData, selectedSlug) {
  const galleries = Array.isArray(galleryData.galleries) ? galleryData.galleries : [];

  return {
    generatedAt: galleryData.generatedAt,
    total: galleryData.total,
    galleries: galleries.map((gallery) => (
      gallery.slug === selectedSlug
        ? gallery
        : {
            ...gallery,
            artworks: []
          }
    ))
  };
}

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
  const localDataPath = path.join(rootDir, "data", "gallery.json");

  try {
    const response = await fetch(defaultGalleryDataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    await writeFile(localDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return payload;
  } catch (error) {
    const localData = await readFile(localDataPath, "utf8");
    console.warn(`Falling back to local gallery data: ${error.message}`);
    return JSON.parse(localData);
  }
}

async function loadI18nData() {
  const source = await readFile(path.join(rootDir, "locale-data.js"), "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.__NYH_I18N__ || { translations: {} };
}

function updateMetaTag(html, matcher, replacement) {
  return html.replace(matcher, replacement);
}

function withAssetVersion(assetPath) {
  return `${assetPath}?v=${assetVersion}`;
}

function getLocalizedValue(locale, valueMap, fallbackValue = "") {
  if (valueMap && typeof valueMap === "object") {
    if (valueMap[locale]) {
      return valueMap[locale];
    }

    if (valueMap.ko) {
      return valueMap.ko;
    }
  }

  return fallbackValue || "";
}

function getLocalePathPrefix(locale) {
  return `/${locale}`;
}

function getOgLocale(locale) {
  return ogLocaleMap[locale] || ogLocaleMap.ko;
}

function getLocalizedHomePath(locale) {
  return `${getLocalePathPrefix(locale)}/`;
}

function getLocalizedGalleryPath(locale) {
  return `${getLocalePathPrefix(locale)}/gallery/`;
}

function getLocalizedSeriesPath(locale, slug) {
  return `${getLocalePathPrefix(locale)}/series/${slug}/`;
}

function localizeStaticText(html, locale, i18n) {
  const translations = i18n.translations?.[locale] || {};

  const staticReplacements = [
    { pattern: /<small data-i18n="brand\.subtitle">[\s\S]*?<\/small>/u, value: `<small data-i18n="brand.subtitle">${escapeHtml(translations.brand?.subtitle || "")}</small>` },
    { pattern: /<span data-i18n="menu\.button">[\s\S]*?<\/span>/u, value: `<span data-i18n="menu.button">${escapeHtml(translations.menu?.button || "")}</span>` },
    { pattern: /<a href="#about" data-i18n="nav\.about">[\s\S]*?<\/a>/u, value: `<a href="#about" data-i18n="nav.about">${escapeHtml(translations.nav?.about || "")}</a>` },
    { pattern: /<a href="index\.html#about" data-i18n="nav\.about">[\s\S]*?<\/a>/u, value: `<a href="index.html#about" data-i18n="nav.about">${escapeHtml(translations.nav?.about || "")}</a>` },
    { pattern: /<a href="#notes" data-i18n="nav\.notes">[\s\S]*?<\/a>/u, value: `<a href="#notes" data-i18n="nav.notes">${escapeHtml(translations.nav?.notes || "")}</a>` },
    { pattern: /<a href="index\.html#notes" data-i18n="nav\.notes">[\s\S]*?<\/a>/u, value: `<a href="index.html#notes" data-i18n="nav.notes">${escapeHtml(translations.nav?.notes || "")}</a>` },
    { pattern: /<a href="gallery\.html" data-i18n="nav\.gallery">[\s\S]*?<\/a>/u, value: `<a href="gallery.html" data-i18n="nav.gallery">${escapeHtml(translations.nav?.gallery || "")}</a>` },
    { pattern: /<button class="nav-contact-trigger"[\s\S]*?data-i18n="nav\.contact">[\s\S]*?<\/button>/u, value: `<button class="nav-contact-trigger" type="button" aria-expanded="false" aria-controls="contact-panel" data-i18n="nav.contact">${escapeHtml(translations.nav?.contact || "")}</button>` },
    { pattern: /<p class="contact-panel-label" data-i18n="contact\.label">[\s\S]*?<\/p>/u, value: `<p class="contact-panel-label" data-i18n="contact.label">${escapeHtml(translations.contact?.label || "")}</p>` },
    { pattern: /<button class="back-to-top" id="back-to-top" type="button" data-i18n="common\.backToTop">[\s\S]*?<\/button>/u, value: `<button class="back-to-top" id="back-to-top" type="button" data-i18n="common.backToTop">${escapeHtml(translations.common?.backToTop || "")}</button>` }
  ];

  return staticReplacements.reduce((result, item) => result.replace(item.pattern, item.value), html);
}

function buildHomePageHtml(template, locale, i18n) {
  const translations = i18n.translations?.[locale] || {};
  const pageTitle = "NYH's Artwork";
  const pageDescription = translations.home?.hero?.body || "흘러가는 순간을 그림으로 붙잡아 모아둔 NYH의 온라인 갤러리";
  const pageUrl = `${siteBaseUrl}${getLocalizedHomePath(locale)}`;

  let html = template;
  html = localizeStaticText(html, locale, i18n);
  html = updateMetaTag(html, /<html lang="[^"]*">/u, `<html lang="${escapeAttribute(locale)}">`);
  html = updateMetaTag(html, /<link rel="stylesheet" href="styles\.css" \/>/u, `<link rel="stylesheet" href="${withAssetVersion("/styles.css")}" />`);
  html = updateMetaTag(html, /<script type="module" src="script\.js"><\/script>/u, `<script type="module" src="${withAssetVersion("/script.js")}"></script>`);
  html = updateMetaTag(html, /src="assets\/profile\.jpg"/gu, `src="${withAssetVersion("/assets/profile.jpg")}"`);
  html = updateMetaTag(html, /href="gallery\.html"/gu, `href="${escapeAttribute(getLocalizedGalleryPath(locale))}"`);
  html = updateMetaTag(html, /<meta\s+name="description"[\s\S]*?\/>/u, `<meta name="description" content="${escapeAttribute(pageDescription)}" />`);
  html = updateMetaTag(html, /<link rel="canonical" href="[^"]*" \/>/u, `<link rel="canonical" href="${escapeAttribute(pageUrl)}" />`);
  html = updateMetaTag(html, /<meta property="og:locale" content="[^"]*" \/>/u, `<meta property="og:locale" content="${escapeAttribute(getOgLocale(locale))}" />`);
  html = updateMetaTag(html, /<meta property="og:url" content="[^"]*" \/>/u, `<meta property="og:url" content="${escapeAttribute(pageUrl)}" />`);
  html = updateMetaTag(html, /<meta\s+property="og:description"[\s\S]*?\/>/u, `<meta property="og:description" content="${escapeAttribute(pageDescription)}" />`);
  html = updateMetaTag(html, /<meta\s+name="twitter:description"[\s\S]*?\/>/u, `<meta name="twitter:description" content="${escapeAttribute(pageDescription)}" />`);
  html = updateMetaTag(
    html,
    /<body[\s\S]*?>/u,
    `<body
    data-gallery-url="/site-data/home.json"
    data-home-url="${escapeAttribute(getLocalizedHomePath(locale))}"
    data-gallery-index-url="${escapeAttribute(getLocalizedGalleryPath(locale))}"
    data-series-base-url="${escapeAttribute(getLocalePathPrefix(locale) + "/series")}"
    data-default-locale="${escapeAttribute(locale)}"
    data-page-kind="home"
  >`
  );

  return html;
}

function buildGalleryPageHtml(template, locale, i18n, galleryData, gallery = null) {
  const translations = i18n.translations?.[locale] || {};
  const localizedGalleryTitle = gallery
    ? getLocalizedValue(locale, gallery.titleI18n, gallery.title)
    : translations.gallery?.rootTitle || "Gallery";
  const localizedGalleryDescription = gallery
    ? getLocalizedValue(locale, gallery.descriptionI18n, gallery.description)
    : translations.gallery?.rootSummary || "Gallery";
  const pageTitle = gallery
    ? `${localizedGalleryTitle} | NYH's Artwork`
    : `NYH's Artwork | ${localizedGalleryTitle}`;
  const pageDescription = localizedGalleryDescription || "흘러가는 순간을 그림으로 붙잡아 모아둔 NYH의 온라인 갤러리";
  const pageUrl = gallery
    ? `${siteBaseUrl}${getLocalizedSeriesPath(locale, gallery.slug)}`
    : `${siteBaseUrl}${getLocalizedGalleryPath(locale)}`;
  const pageImage = gallery?.artworks?.[0]?.imageUrl || defaultOgImage;

  let html = template;
  html = localizeStaticText(html, locale, i18n);
  html = updateMetaTag(html, /<html lang="[^"]*">/u, `<html lang="${escapeAttribute(locale)}">`);
  html = updateMetaTag(html, /<link rel="stylesheet" href="styles\.css" \/>/u, `<link rel="stylesheet" href="${withAssetVersion("/styles.css")}" />`);
  html = updateMetaTag(html, /<script type="module" src="script\.js"><\/script>/u, `<script type="module" src="${withAssetVersion("/script.js")}"></script>`);
  html = updateMetaTag(html, /src="assets\/profile\.jpg"/gu, `src="${withAssetVersion("/assets/profile.jpg")}"`);

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
    /<meta property="og:locale" content="[^"]*" \/>/u,
    `<meta property="og:locale" content="${escapeAttribute(getOgLocale(locale))}" />`
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
    data-gallery-url="${escapeAttribute(gallery ? `/site-data/series/${gallery.slug}.json` : "/site-data/gallery.json")}"
    data-home-url="${escapeAttribute(getLocalizedHomePath(locale))}"
    data-gallery-index-url="${escapeAttribute(getLocalizedGalleryPath(locale))}"
    data-series-base-url="${escapeAttribute(getLocalePathPrefix(locale) + "/series")}"
    data-default-locale="${escapeAttribute(locale)}"
    data-page-kind="${gallery ? "series" : "gallery"}"
    ${gallery ? `data-selected-series="${escapeAttribute(gallery.slug)}"` : ""}
  >`
  );
  html = updateMetaTag(
    html,
    /href="index\.html"/gu,
    `href="${escapeAttribute(getLocalizedHomePath(locale))}"`
  );
  html = updateMetaTag(
    html,
    /href="index\.html#about"/gu,
    `href="${escapeAttribute(getLocalizedHomePath(locale) + "#about")}"`
  );
  html = updateMetaTag(
    html,
    /href="index\.html#notes"/gu,
    `href="${escapeAttribute(getLocalizedHomePath(locale) + "#notes")}"`
  );
  html = updateMetaTag(
    html,
    /href="gallery\.html"/gu,
    `href="${escapeAttribute(getLocalizedGalleryPath(locale))}"`
  );

  if (gallery) {
    html = updateMetaTag(
      html,
      /<p class="eyebrow" id="gallery-page-eyebrow">[\s\S]*?<\/p>/u,
      `<p class="eyebrow" id="gallery-page-eyebrow">${escapeHtml(translations.gallery?.seriesEyebrow || "Series")}</p>`
    );
    html = updateMetaTag(
      html,
      /<h1 id="gallery-page-title">[\s\S]*?<\/h1>/u,
      `<h1 id="gallery-page-title">${escapeHtml(localizedGalleryTitle)}</h1>`
    );
    html = updateMetaTag(
      html,
      /<p id="gallery-summary" class="page-hero-body">[\s\S]*?<\/p>/u,
      `<p id="gallery-summary" class="page-hero-body">${escapeHtml(pageDescription)}</p>`
    );
  } else {
    html = updateMetaTag(
      html,
      /<p class="eyebrow" id="gallery-page-eyebrow">[\s\S]*?<\/p>/u,
      `<p class="eyebrow" id="gallery-page-eyebrow">${escapeHtml(translations.gallery?.rootEyebrow || "Archive")}</p>`
    );
    html = updateMetaTag(
      html,
      /<h1 id="gallery-page-title">[\s\S]*?<\/h1>/u,
      `<h1 id="gallery-page-title">${escapeHtml(translations.gallery?.rootTitle || "Gallery")}</h1>`
    );
    html = updateMetaTag(
      html,
      /<p id="gallery-summary" class="page-hero-body">[\s\S]*?<\/p>/u,
      `<p id="gallery-summary" class="page-hero-body">${escapeHtml(pageDescription)}</p>`
    );
  }

  return html;
}

function buildSitemapXml(galleries) {
  const urls = new Set([`${siteBaseUrl}/`]);

  supportedLocales.forEach((locale) => {
    urls.add(`${siteBaseUrl}${getLocalizedHomePath(locale)}`);
    urls.add(`${siteBaseUrl}${getLocalizedGalleryPath(locale)}`);

    galleries.forEach((gallery) => {
      urls.add(`${siteBaseUrl}${getLocalizedSeriesPath(locale, gallery.slug)}`);
    });
  });

  const entries = [...urls]
    .map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function collectJsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function rewriteModuleSpecifiers(filePath) {
  const source = await readFile(filePath, "utf8");
  const rewritten = source.replace(
    /(from\s+["'](\.\/|\.\.\/)[^"']+\.js)(["'])/g,
    `$1?v=${assetVersion}$3`
  ).replace(
    /(import\s+["'](\.\/|\.\.\/)[^"']+\.js)(["'])/g,
    `$1?v=${assetVersion}$3`
  );

  if (rewritten !== source) {
    await writeFile(filePath, rewritten, "utf8");
  }
}

const galleryData = await loadGalleryData();
const i18nData = await loadI18nData();
const galleries = Array.isArray(galleryData.galleries) ? galleryData.galleries : [];
const indexTemplate = await readFile(path.join(rootDir, "index.html"), "utf8");
const galleryTemplate = await readFile(path.join(rootDir, "gallery.html"), "utf8");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await mkdir(path.join(distDir, "site-data", "series"), { recursive: true });

for (const file of filesToCopy) {
  await cp(path.join(rootDir, file), path.join(distDir, file));
}

for (const directory of directoriesToCopy) {
  await cp(path.join(rootDir, directory), path.join(distDir, directory), {
    recursive: true
  });
}

await writeFile(path.join(distDir, "site-data", "gallery.json"), `${JSON.stringify(galleryData, null, 2)}\n`, "utf8");
await writeFile(path.join(distDir, "site-data", "home.json"), `${JSON.stringify(buildHomeGalleryData(galleryData), null, 2)}\n`, "utf8");

const jsFiles = await collectJsFiles(path.join(distDir, "js"));
jsFiles.push(path.join(distDir, "script.js"));
for (const jsFile of jsFiles) {
  await rewriteModuleSpecifiers(jsFile);
}

for (const locale of supportedLocales) {
  const localeRootDir = path.join(distDir, locale);
  const localeGalleryDir = path.join(localeRootDir, "gallery");
  await mkdir(localeGalleryDir, { recursive: true });
  await writeFile(path.join(localeRootDir, "index.html"), buildHomePageHtml(indexTemplate, locale, i18nData), "utf8");
  await writeFile(path.join(localeGalleryDir, "index.html"), buildGalleryPageHtml(galleryTemplate, locale, i18nData, galleryData), "utf8");

  for (const gallery of galleries) {
    const localizedSeriesDir = path.join(localeRootDir, "series", gallery.slug);
    await mkdir(localizedSeriesDir, { recursive: true });
      await writeFile(
        path.join(localizedSeriesDir, "index.html"),
        buildGalleryPageHtml(galleryTemplate, locale, i18nData, galleryData, gallery),
        "utf8"
      );
  }
}

const rootHomeHtml = buildHomePageHtml(indexTemplate, "ko", i18nData)
  .replace(/data-home-url="\/ko\/"/u, 'data-home-url="index.html"')
  .replace(/data-gallery-index-url="\/ko\/gallery\/"/u, 'data-gallery-index-url="gallery.html"')
  .replace(/data-series-base-url="\/ko\/series"/u, 'data-series-base-url="series"')
  .replace(/href="\/ko\/gallery\/"/gu, 'href="gallery.html"')
  .replace(/src="\/assets\//gu, 'src="/assets/');

const rootGalleryHtml = buildGalleryPageHtml(galleryTemplate, "ko", i18nData, galleryData)
  .replace(/data-home-url="\/ko\/"/u, 'data-home-url="index.html"')
  .replace(/data-gallery-index-url="\/ko\/gallery\/"/u, 'data-gallery-index-url="gallery.html"')
  .replace(/data-series-base-url="\/ko\/series"/u, 'data-series-base-url="series"')
  .replace(/href="\/ko\/"/gu, 'href="index.html"')
  .replace(/href="\/ko\/gallery\/"/gu, 'href="gallery.html"');

await writeFile(path.join(distDir, "index.html"), rootHomeHtml, "utf8");
await writeFile(path.join(distDir, "gallery.html"), rootGalleryHtml, "utf8");

for (const gallery of galleries) {
  const seriesDir = path.join(distDir, "series", gallery.slug);
  await mkdir(seriesDir, { recursive: true });
  const seriesHtml = buildGalleryPageHtml(galleryTemplate, "ko", i18nData, galleryData, gallery)
    .replace(/data-home-url="\/ko\/"/u, 'data-home-url="index.html"')
    .replace(/data-gallery-index-url="\/ko\/gallery\/"/u, 'data-gallery-index-url="gallery.html"')
    .replace(/data-series-base-url="\/ko\/series"/u, 'data-series-base-url="series"')
    .replace(/data-default-locale="ko"/u, 'data-default-locale="ko"')
    .replace(/data-page-kind="series"/u, 'data-page-kind="series"');
  await writeFile(path.join(seriesDir, "index.html"), seriesHtml, "utf8");
  await writeFile(
    path.join(distDir, "site-data", "series", `${gallery.slug}.json`),
    `${JSON.stringify(buildSeriesGalleryData(galleryData, gallery.slug), null, 2)}\n`,
    "utf8"
  );
}

await writeFile(path.join(distDir, "sitemap.xml"), buildSitemapXml(galleries), "utf8");

console.log(`Built deployable site into dist/ with ${galleries.length} series pages.`);
