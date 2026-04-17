import { state } from "./store.js";
import { getCurrentLocale } from "./i18n.js";

export function getLocalizedContent(valueMap, fallbackValue = "") {
  const currentLocale = getCurrentLocale();

  if (valueMap && typeof valueMap === "object") {
    if (valueMap[currentLocale]) {
      return valueMap[currentLocale];
    }

    if (valueMap.ko) {
      return valueMap.ko;
    }

    const firstValue = Object.values(valueMap).find(Boolean);
    if (firstValue) {
      return firstValue;
    }
  }

  return fallbackValue || "";
}

export function getGalleryBySlug(slug) {
  return state.galleries.find((gallery) => gallery.slug === slug) || null;
}

export function getGalleryTitle(gallery) {
  return getLocalizedContent(gallery?.titleI18n, gallery?.title || "");
}

export function getGalleryDescription(gallery) {
  return getLocalizedContent(gallery?.descriptionI18n, gallery?.description || "");
}

export function getArtworkTitle(artwork) {
  return getLocalizedContent(artwork?.titleI18n, artwork?.title || "");
}

export function getArtworkSubtitle(artwork) {
  return getLocalizedContent(artwork?.subtitleI18n, artwork?.subtitle || "");
}

export function getArtworkDescription(artwork) {
  return getLocalizedContent(artwork?.descriptionI18n, artwork?.description || "");
}

export function getArtworkImageUrl(artwork) {
  return artwork.imageUrl || "";
}

export function getThumbnailSizeClass(artwork) {
  const gallery = getGalleryBySlug(artwork.folder);
  const thumbnailSize = gallery?.thumbnailSize || "default";
  return `thumbnail-size-${thumbnailSize}`;
}

export function getGalleryDataSourceUrl() {
  const datasetUrl = document.body?.dataset.galleryUrl;
  if (datasetUrl) {
    return datasetUrl;
  }

  if (window.__NYH_GALLERY_URL__) {
    return window.__NYH_GALLERY_URL__;
  }

  return "data/gallery.json";
}

export function getHomeUrl() {
  return document.body?.dataset.homeUrl || "index.html";
}

export function getGalleryIndexUrl() {
  return document.body?.dataset.galleryIndexUrl || "gallery.html";
}

export function getSeriesBaseUrl() {
  return document.body?.dataset.seriesBaseUrl || "series";
}

export function getSeriesPageUrl(slug) {
  const baseUrl = getSeriesBaseUrl().replace(/\/+$/u, "");
  return `${baseUrl}/${encodeURIComponent(slug)}/`;
}

export function getSelectedSeriesSlug() {
  const datasetSeriesSlug = document.body?.dataset.selectedSeries;
  if (datasetSeriesSlug) {
    return datasetSeriesSlug;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("series") || "";
}

export function getFilteredGalleries() {
  const selectedSeriesSlug = getSelectedSeriesSlug();
  if (!selectedSeriesSlug) {
    return state.galleries;
  }

  return state.galleries.filter((gallery) => gallery.slug === selectedSeriesSlug);
}

export function pickRandomArtworks(count, source = state.artworks) {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function shuffleArtworks(source = []) {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function hasArtworkMetadata(artwork) {
  if (!artwork) return false;

  const hasFallbackTitle = /^작품 \d+$/u.test(String(getArtworkTitle(artwork) || "").trim());
  const hasFallbackSubtitle = /^아카이브 \d+$/u.test(String(getArtworkSubtitle(artwork) || "").trim());
  const hasFallbackDescription =
    String(getArtworkDescription(artwork) || "").trim() === "설명이 아직 등록되지 않은 작품입니다.";

  const hasCustomTitle = Boolean(getArtworkTitle(artwork)) && !hasFallbackTitle;
  const hasCustomSubtitle = Boolean(getArtworkSubtitle(artwork)) && !hasFallbackSubtitle;
  const hasCustomDescription = Boolean(getArtworkDescription(artwork)) && !hasFallbackDescription;
  const hasExtraMetadata = Boolean(artwork.medium || artwork.size || artwork.year);

  return hasCustomTitle || hasCustomSubtitle || hasCustomDescription || hasExtraMetadata;
}

export function hasArtworkTitle(artwork) {
  if (!artwork) return false;

  const title = String(getArtworkTitle(artwork) || "").trim();
  if (!title) return false;

  return !/^작품 \d+$/u.test(title);
}
