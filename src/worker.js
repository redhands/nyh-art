const supportedLocales = ["ko", "en", "ja", "zh"];
const localeCookieName = "nyh-locale";

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

function getSeriesQueryPath(searchParams, locale) {
  const seriesSlug = searchParams.get("series") || "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(seriesSlug)) {
    return "";
  }

  return `/${locale}/series/${encodeURIComponent(seriesSlug)}/`;
}

function buildLocalizedPath(pathname, searchParams, locale) {
  if (pathname === "/" || pathname === "/index.html") {
    return `/${locale}/`;
  }

  if (pathname === "/gallery" || pathname === "/gallery/") {
    const seriesPath = getSeriesQueryPath(searchParams, locale);
    if (seriesPath) return seriesPath;

    return `/${locale}/gallery/`;
  }

  if (pathname === "/gallery.html") {
    const seriesPath = getSeriesQueryPath(searchParams, locale);
    if (seriesPath) return seriesPath;

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!shouldBypassLocaleRedirect(url.pathname)) {
      const locale = getPreferredLocale(request);
      const localizedPath = buildLocalizedPath(url.pathname, url.searchParams, locale);

      if (localizedPath) {
        url.pathname = localizedPath;
        url.search = "";
        return Response.redirect(url.toString(), 302);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
