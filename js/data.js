import { elements } from "./dom.js";
import { state } from "./store.js";
import { t } from "./i18n.js";
import { getGalleryDataSourceUrl } from "./content.js";
import { refreshView } from "./render.js";

function hydrateGalleryState(payload) {
  const galleries = normalizeGalleries(payload);
  const totalArtworks = typeof payload?.total === "number"
    ? payload.total
    : galleries.reduce((sum, gallery) => sum + Number(gallery.total || (gallery.artworks || []).length || 0), 0);

  state.galleries = galleries;
  state.artworks = galleries.flatMap((gallery) => gallery.artworks || []);
  state.totalArtworks = totalArtworks;
  refreshView();
}

function normalizeGalleries(data) {
  return Array.isArray(data?.galleries) ? data.galleries : [];
}

export async function loadGallery() {
  if (elements.gallerySummary && !elements.gallerySummary.textContent.trim()) {
    elements.gallerySummary.textContent = t("gallery.loading");
  }

  try {
    const response = await fetch(getGalleryDataSourceUrl());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    hydrateGalleryState(data);
  } catch (error) {
    console.error("갤러리 데이터를 불러오지 못했습니다.", error);

    if (elements.gallerySummary) {
      elements.gallerySummary.textContent = t("gallery.loadError");
    }
  }
}
