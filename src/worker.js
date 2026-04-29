const supportedLocales = ["ko", "en", "ja", "zh"];
const localeCookieName = "nyh-locale";
const remoteGalleryDataUrl = "https://img.nyh-art.com/site-data/gallery.json";

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";

  const cookieName = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName))
    ?.slice(cookieName.length) || "";
}

function normalizeLocale(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return "";
}

function getPreferredLocale(request) {
  const cookieLocale = normalizeLocale(getCookieValue(request.headers.get("Cookie"), localeCookieName));
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("Accept-Language") || "";
  const candidates = acceptLanguage.split(",").map((part) => part.trim());
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return "ko";
}

function buildLocalizedPath(pathname, locale) {
  if (pathname === "/" || pathname === "/index.html") {
    return `/${locale}/`;
  }

  if (pathname === "/gallery" || pathname === "/gallery/") {
    return `/${locale}/gallery/`;
  }

  if (pathname === "/gallery.html") {
    return `/${locale}/gallery/`;
  }

  const seriesMatch = pathname.match(/^\/series\/([^/]+)\/?$/);
  if (seriesMatch) {
    return `/${locale}/series/${encodeURIComponent(seriesMatch[1])}/`;
  }

  return "";
}

function shouldBypassLocaleRedirect(pathname) {
  return /^\/(ko|en|ja|zh)(\/|$)/.test(pathname);
}

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

async function fetchRemoteGalleryData() {
  const response = await fetch(remoteGalleryDataUrl, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch remote gallery data: HTTP ${response.status}`);
  }

  return response.json();
}

function jsonResponse(payload) {
  return new Response(`${JSON.stringify(payload)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/site-data/home.json") {
      const galleryData = await fetchRemoteGalleryData();
      return jsonResponse(buildHomeGalleryData(galleryData));
    }

    if (url.pathname === "/site-data/gallery.json") {
      const galleryData = await fetchRemoteGalleryData();
      return jsonResponse(galleryData);
    }

    const seriesDataMatch = url.pathname.match(/^\/site-data\/series\/([^/]+)\.json$/);
    if (seriesDataMatch) {
      const galleryData = await fetchRemoteGalleryData();
      return jsonResponse(buildSeriesGalleryData(galleryData, decodeURIComponent(seriesDataMatch[1])));
    }

    if (!shouldBypassLocaleRedirect(url.pathname)) {
      const locale = getPreferredLocale(request);
      const localizedPath = buildLocalizedPath(url.pathname, locale);

      if (localizedPath) {
        url.pathname = localizedPath;
        return Response.redirect(url.toString(), 302);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
