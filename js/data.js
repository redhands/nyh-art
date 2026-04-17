import { elements } from "./dom.js";
import { state } from "./store.js";
import { t } from "./i18n.js";
import { getGalleryDataSourceUrl } from "./content.js";
import { refreshView } from "./render.js";

function hydrateGalleryState(galleries) {
  state.galleries = galleries;
  state.artworks = galleries.flatMap((gallery) => gallery.artworks || []);
  refreshView();
}

function normalizeGalleries(data) {
  return Array.isArray(data?.galleries) ? data.galleries : [];
}

function getGalleryFingerprint(galleries) {
  return JSON.stringify(
    galleries.map((gallery) => ({
      slug: gallery.slug,
      title: gallery.title,
      titleI18n: gallery.titleI18n,
      description: gallery.description,
      descriptionI18n: gallery.descriptionI18n,
      total: gallery.total,
      artworks: (gallery.artworks || []).map((artwork) => ({
        fileName: artwork.fileName,
        title: artwork.title,
        titleI18n: artwork.titleI18n,
        subtitle: artwork.subtitle,
        subtitleI18n: artwork.subtitleI18n,
        description: artwork.description,
        descriptionI18n: artwork.descriptionI18n
      }))
    }))
  );
}

export async function loadGallery() {
  const inlineGalleries = normalizeGalleries(window.__NYH_GALLERY__);
  let currentFingerprint = "";

  if (inlineGalleries.length) {
    hydrateGalleryState(inlineGalleries);
    currentFingerprint = getGalleryFingerprint(inlineGalleries);
  }

  try {
    const response = await fetch(getGalleryDataSourceUrl(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const galleries = normalizeGalleries(data);
    const nextFingerprint = getGalleryFingerprint(galleries);

    if (!inlineGalleries.length || nextFingerprint !== currentFingerprint) {
      hydrateGalleryState(galleries);
    }
  } catch (error) {
    if (inlineGalleries.length) {
      console.warn("최신 갤러리 데이터를 불러오지 못해 페이지 내 기본 데이터를 사용합니다.", error);
      return;
    }

    console.error("갤러리 데이터를 불러오지 못했습니다.", error);

    if (elements.gallerySummary) {
      elements.gallerySummary.textContent = t("gallery.loadError");
    }
  }
}
