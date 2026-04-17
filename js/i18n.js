import { elements } from "./dom.js";

const i18nData = window.__NYH_I18N__ || {};
const translations = i18nData.translations || {};
const localeLabels = i18nData.localeLabels || { ko: "한국어" };
const supportedLocales = i18nData.supportedLocales || ["ko"];

let currentLocale = getPreferredLocale();

function getSavedLocale() {
  try {
    const savedLocale = window.localStorage.getItem("nyh-locale");
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      return savedLocale;
    }
  } catch {
    // Ignore storage errors and fall back.
  }

  return "";
}

function getBrowserPreferredLocale() {
  const candidates = Array.isArray(window.navigator.languages) && window.navigator.languages.length
    ? window.navigator.languages
    : [window.navigator.language].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = String(candidate || "").toLowerCase();
    if (normalized.startsWith("ko")) return "ko";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("en")) return "en";
  }

  return "ko";
}

function getPreferredLocale() {
  const pageLocale = document.body?.dataset.defaultLocale;
  if (pageLocale && supportedLocales.includes(pageLocale)) {
    return pageLocale;
  }

  return getSavedLocale() || "ko";
}

function getTranslationValue(locale, key) {
  return key.split(".").reduce((value, segment) => value?.[segment], translations[locale]);
}

export function getCurrentLocale() {
  return currentLocale;
}

export function setCurrentLocale(nextLocale) {
  currentLocale = nextLocale;
}

export function t(key, ...args) {
  const value =
    getTranslationValue(currentLocale, key) ??
    getTranslationValue("ko", key) ??
    key;

  return typeof value === "function" ? value(...args) : value;
}

export function applyStaticTranslations() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  elements.menuToggle?.setAttribute("aria-label", t("menu.button"));
  elements.lightboxClose?.setAttribute("aria-label", t("common.close"));

  elements.localeSwitcherButtons.forEach((button) => {
    const isActive = button.dataset.locale === currentLocale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (elements.localeCurrentLabel) {
    elements.localeCurrentLabel.textContent = localeLabels[currentLocale] || localeLabels.ko;
  }
}

function buildLocalePageUrl(locale) {
  const pageKind = document.body?.dataset.pageKind || "home";
  const selectedSeries = document.body?.dataset.selectedSeries || "";

  if (pageKind === "series" && selectedSeries) {
    return `/${locale}/series/${encodeURIComponent(selectedSeries)}/`;
  }

  if (pageKind === "gallery") {
    return `/${locale}/gallery/`;
  }

  return `/${locale}/`;
}

export function redirectRootToPreferredLocale() {
  const pageKind = document.body?.dataset.pageKind || "";
  const pathname = window.location.pathname || "/";
  const isRootPath = pathname === "/" || pathname === "/index.html";

  if (pageKind !== "home" || !isRootPath) {
    return;
  }

  const targetLocale = getSavedLocale() || getBrowserPreferredLocale();
  const targetUrl = buildLocalePageUrl(targetLocale);
  const currentUrl = `${pathname}${window.location.search}${window.location.hash}`;
  const desiredUrl = `${targetUrl}${window.location.search}${window.location.hash}`;

  if (currentUrl === desiredUrl) {
    return;
  }

  window.location.replace(desiredUrl);
}

export function bindLocaleSwitcher() {
  elements.localeCurrentButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isHidden = elements.localeSwitcherMenu?.hasAttribute("hidden");

    if (isHidden) {
      elements.localeSwitcherMenu?.removeAttribute("hidden");
      elements.localeCurrentButton?.setAttribute("aria-expanded", "true");
    } else {
      elements.localeSwitcherMenu?.setAttribute("hidden", "");
      elements.localeCurrentButton?.setAttribute("aria-expanded", "false");
    }
  });

  elements.localeSwitcherButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLocale = button.dataset.locale;
      if (!nextLocale || nextLocale === currentLocale) return;

      try {
        window.localStorage.setItem("nyh-locale", nextLocale);
      } catch {
        // Ignore storage errors and continue with navigation.
      }

      window.location.href = buildLocalePageUrl(nextLocale);
    });
  });

  elements.localeSwitcher?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    elements.localeSwitcherMenu?.setAttribute("hidden", "");
    elements.localeCurrentButton?.setAttribute("aria-expanded", "false");
  });
}
