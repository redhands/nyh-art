import { elements } from "./dom.js";
import { state } from "./store.js";
import { t } from "./i18n.js";
import {
  getArtworkImageUrl,
  getArtworkTitle,
  getFilteredGalleries,
  getGalleryDescription,
  getGalleryIndexUrl,
  getGalleryTitle,
  getSelectedSeriesSlug,
  getSeriesPageUrl,
  getThumbnailSizeClass,
  pickRandomArtworks,
  shuffleArtworks
} from "./content.js";
import { openLightboxForArtwork, bindReveal } from "./ui.js";

const masonryStates = new Map();
const puzzleOrders = new Map();
let masonryResizeBound = false;
const PUZZLE_COOKIE_PREFIX = "nyh-puzzle-order-";

function createArtworkThumbnail(artwork, eager = false) {
  const loadingMode = eager ? "eager" : "lazy";
  const fetchPriority = eager ? "high" : "auto";
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork) || t("common.untitledArtwork");

  const frame = document.createElement("div");
  frame.className = `thumbnail-frame ${thumbnailSizeClass}`;

  const image = document.createElement("img");
  image.src = getArtworkImageUrl(artwork);
  image.alt = artworkTitle;
  image.loading = loadingMode;
  image.setAttribute("fetchpriority", fetchPriority);
  image.decoding = "async";

  frame.appendChild(image);
  return frame;
}

function shouldPrioritizeGalleryImage(index, thumbnailSizeClass) {
  if (thumbnailSizeClass === "thumbnail-size-icon") {
    return index < 36;
  }

  return index < 16;
}

function pickFeaturedIndices(
  artworks,
  ratio = 0.2,
  maxCount = Number.POSITIVE_INFINITY,
  minCount = 1
) {
  const candidateIndices = artworks
    .map((artwork, index) => ({ artwork, index }))
    .filter(({ artwork }) => getThumbnailSizeClass(artwork) !== "thumbnail-size-icon")
    .map(({ index }) => index);

  if (!candidateIndices.length) {
    return new Set();
  }

  const targetCount = Math.min(
    maxCount,
    Math.max(minCount, Math.round(candidateIndices.length * ratio))
  );
  const shuffledCandidates = shuffleArtworks(candidateIndices);
  const selected = [];

  const fillWithDistance = (minimumDistance) => {
    shuffledCandidates.forEach((candidateIndex) => {
      if (selected.length >= targetCount) return;
      if (selected.includes(candidateIndex)) return;

      const isTooClose = selected.some(
        (selectedIndex) => Math.abs(selectedIndex - candidateIndex) <= minimumDistance
      );

      if (!isTooClose) {
        selected.push(candidateIndex);
      }
    });
  };

  fillWithDistance(2);
  if (selected.length < targetCount) fillWithDistance(1);
  if (selected.length < targetCount) fillWithDistance(0);

  return new Set(selected);
}

function createGalleryCard(artwork, index, options = {}) {
  const { disableLightbox = false, featured = false } = options;
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork);
  const eager = shouldPrioritizeGalleryImage(index, thumbnailSizeClass);
  card.className = `gallery-card reveal ${thumbnailSizeClass}${featured ? " thumbnail-featured" : ""}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artworkTitle || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);
  card.appendChild(createArtworkThumbnail(artwork, eager));
  if (!disableLightbox) {
    card.addEventListener("click", () => openLightboxForArtwork(artwork));
  }
  return card;
}

function swapItems(items, fromIndex, toIndex) {
  const next = [...items];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

function getPuzzleCookieName(slug) {
  return `${PUZZLE_COOKIE_PREFIX}${slug}`;
}

function readPuzzleCookie(slug) {
  const cookieName = `${getPuzzleCookieName(slug)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName));

  if (!cookie) return [];

  try {
    return JSON.parse(decodeURIComponent(cookie.slice(cookieName.length)));
  } catch {
    return [];
  }
}

function writePuzzleCookie(slug, artworks) {
  const value = encodeURIComponent(JSON.stringify(artworks.map((artwork) => artwork.fileName)));
  document.cookie = `${getPuzzleCookieName(slug)}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function getPuzzleOrder(gallery) {
  if (!gallery?.artworks?.length) return [];

  const artworkMap = new Map(gallery.artworks.map((artwork) => [artwork.fileName, artwork]));
  const currentOrder = puzzleOrders.get(gallery.slug) || [];
  const validCurrentOrder = currentOrder
    .map((artwork) => artworkMap.get(artwork.fileName))
    .filter(Boolean);
  const missingArtworks = gallery.artworks.filter(
    (artwork) => !validCurrentOrder.find((orderedArtwork) => orderedArtwork.fileName === artwork.fileName)
  );

  if (!puzzleOrders.has(gallery.slug) || missingArtworks.length || validCurrentOrder.length !== gallery.artworks.length) {
    const savedFileNames = readPuzzleCookie(gallery.slug);
    const savedOrder = savedFileNames
      .map((fileName) => artworkMap.get(fileName))
      .filter(Boolean);
    const baseOrder = savedOrder.length ? savedOrder : validCurrentOrder;
    const nextMissingArtworks = gallery.artworks.filter(
      (artwork) => !baseOrder.find((orderedArtwork) => orderedArtwork.fileName === artwork.fileName)
    );
    const nextOrder = baseOrder.length
      ? [...baseOrder, ...nextMissingArtworks]
      : pickRandomArtworks(gallery.artworks.length, gallery.artworks);

    puzzleOrders.set(gallery.slug, nextOrder);
    writePuzzleCookie(gallery.slug, nextOrder);
  }

  return puzzleOrders.get(gallery.slug) || [];
}

function createArchivePreviewCard(artwork, options = {}) {
  const { featured = false } = options;
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork);
  card.className = `archive-preview-card reveal ${thumbnailSizeClass}${featured ? " thumbnail-featured" : ""}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artworkTitle || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);
  card.appendChild(createArtworkThumbnail(artwork, true));
  card.addEventListener("click", () => openLightboxForArtwork(artwork));
  return card;
}

function createSeriesFilterLink(item) {
  const link = document.createElement("a");
  link.className = `series-filter-link${item.active ? " is-active" : ""}`;
  link.href = item.href;
  link.textContent = item.label;
  return link;
}

function createArchiveEntryLink(href, label, isPrimary = false) {
  const link = document.createElement("a");
  link.className = `archive-entry-link${isPrimary ? " archive-entry-link-primary" : ""}`;
  link.href = href;

  const icon = document.createElement("span");
  icon.className = "archive-entry-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";

  const text = document.createElement("span");
  text.textContent = label;

  link.append(icon, text);
  return link;
}

function createGalleryGroupHeader(gallery, galleryTitle, galleryDescription) {
  const header = document.createElement("div");
  header.className = "gallery-group-header";

  const copy = document.createElement("div");

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = t("gallery.seriesEyebrow");

  const title = document.createElement("h3");
  title.textContent = galleryTitle;

  copy.append(eyebrow, title);

  if (galleryDescription) {
    const description = document.createElement("p");
    description.textContent = galleryDescription;
    copy.appendChild(description);
  }

  header.appendChild(copy);

  const grid = document.createElement("div");
  grid.className = `gallery-grid${gallery.thumbnailSize === "icon" ? " gallery-grid-icon" : ""}`;

  return { header, grid };
}

function layoutMasonryItem(grid, item) {
  const computedStyle = window.getComputedStyle(grid);
  const rowHeight = Number.parseFloat(computedStyle.getPropertyValue("grid-auto-rows"));
  const rowGap = Number.parseFloat(computedStyle.getPropertyValue("gap"));

  if (!rowHeight) return;

  item.style.gridRowEnd = "auto";
  const contentHeight = item.getBoundingClientRect().height;
  const rowSpan = Math.max(1, Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap)));
  item.style.gridRowEnd = `span ${rowSpan}`;
}

function relayoutAllMasonryGrids() {
  masonryStates.forEach(({ grid, items }) => {
    if (!document.body.contains(grid)) {
      masonryStates.delete(grid);
      return;
    }

    items.forEach((item) => {
      layoutMasonryItem(grid, item);
    });
  });
}

function bindMasonryGrid(grid) {
  if (!grid) return;

  const items = Array.from(grid.children);
  masonryStates.set(grid, { grid, items });

  items.forEach((item) => {
    const image = item.querySelector("img");
    if (!image) return;

    if (image.complete) {
      layoutMasonryItem(grid, item);
      return;
    }

    image.addEventListener(
      "load",
      () => {
        layoutMasonryItem(grid, item);
      },
      { once: true }
    );
    image.addEventListener("error", () => layoutMasonryItem(grid, item), { once: true });
  });

  if (!masonryResizeBound) {
    window.addEventListener("resize", relayoutAllMasonryGrids, { passive: true });
    masonryResizeBound = true;
  }

  requestAnimationFrame(relayoutAllMasonryGrids);
  window.setTimeout(relayoutAllMasonryGrids, 120);
}

export function refreshVisibleState() {
  state.visibleGalleries = getFilteredGalleries();
  state.visibleArtworks = state.visibleGalleries.flatMap((gallery) => gallery.artworks || []);
}

export function renderHeroImages() {
  if (!elements.heroImageMain || !elements.heroImageTop || !elements.heroImageBottom) return;

  const heroCandidates = state.artworks.filter(
    (artwork) => getThumbnailSizeClass(artwork) !== "thumbnail-size-icon"
  );
  const selected = pickRandomArtworks(3, heroCandidates.length ? heroCandidates : state.artworks);
  const targets = [elements.heroImageMain, elements.heroImageTop, elements.heroImageBottom];

  selected.forEach((artwork, index) => {
    const target = targets[index];
    if (!target) return;

    target.src = getArtworkImageUrl(artwork);
    target.alt = getArtworkTitle(artwork) || t("common.untitledArtwork");
  });
}

export function renderSeriesFilter() {
  if (!elements.seriesFilter) return;

  const selectedSeriesSlug = getSelectedSeriesSlug();
  const items = [
    {
      href: getGalleryIndexUrl(),
      label: t("common.allView"),
      active: !selectedSeriesSlug
    },
    ...state.galleries.map((gallery) => ({
      href: getSeriesPageUrl(gallery.slug),
      label: getGalleryTitle(gallery),
      active: selectedSeriesSlug === gallery.slug
    }))
  ];

  elements.seriesFilter.replaceChildren(...items.map(createSeriesFilterLink));
}

export function renderArchiveEntryLinks() {
  if (!elements.archiveEntryLinks || !state.galleries.length) return;

  const items = [
    createArchiveEntryLink(getGalleryIndexUrl(), t("common.wholeGallery"), true),
    ...state.galleries.map((gallery) => (
      createArchiveEntryLink(getSeriesPageUrl(gallery.slug), getGalleryTitle(gallery))
    ))
  ];

  elements.archiveEntryLinks.replaceChildren(...items);
}

export function renderArchivePreview() {
  const archivePreviewGrid = document.querySelector("#archive-preview-grid");
  if (!archivePreviewGrid) return;

  archivePreviewGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const archiveSource = state.galleries
    .filter((gallery) => gallery.showInArchive !== false)
    .flatMap((gallery) => gallery.artworks || []);

  const previewSource = archiveSource.length ? archiveSource : state.artworks;
  const selectedArtworks = pickRandomArtworks(8, previewSource).sort((left, right) => {
    const leftIsIcon = getThumbnailSizeClass(left) === "thumbnail-size-icon";
    const rightIsIcon = getThumbnailSizeClass(right) === "thumbnail-size-icon";

    if (leftIsIcon === rightIsIcon) {
      return 0;
    }

    return leftIsIcon ? 1 : -1;
  });
  selectedArtworks.forEach((artwork, index) => {
    fragment.appendChild(createArchivePreviewCard(artwork, { featured: index === 2 }));
  });

  archivePreviewGrid.appendChild(fragment);
  bindMasonryGrid(archivePreviewGrid);
}

export function renderGallery() {
  if (!elements.galleryGroupsContainer) return;

  elements.galleryGroupsContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let artworkIndex = 0;

  state.visibleGalleries.forEach((gallery) => {
    const section = document.createElement("section");
    section.className = "gallery-group reveal";
    section.setAttribute("aria-labelledby", `gallery-group-${gallery.slug}`);
    section.id = `gallery-group-${gallery.slug}`;
    const galleryTitle = getGalleryTitle(gallery);
    const galleryDescription = getGalleryDescription(gallery);

    const { header, grid } = createGalleryGroupHeader(gallery, galleryTitle, galleryDescription);
    section.append(header, grid);
    const displayedArtworks =
      gallery.thumbnailSize === "icon"
        ? getPuzzleOrder(gallery)
        : shuffleArtworks(gallery.artworks);

    if (gallery.thumbnailSize === "icon") {
      const cardMap = new Map();
      let selectedIndex = -1;

      const clearSelectedCard = () => {
        grid.querySelectorAll(".gallery-card.is-selected").forEach((card) => {
          card.classList.remove("is-selected");
          card.setAttribute("aria-pressed", "false");
        });
      };

      const setSelectedCard = (index) => {
        clearSelectedCard();
        if (index < 0) return;

        const selectedCard = grid.querySelector(`.gallery-card[data-index="${index}"]`);
        if (!selectedCard) return;

        selectedCard.classList.add("is-selected");
        selectedCard.setAttribute("aria-pressed", "true");
      };

      const commitIconSwap = (fromIndex, toIndex) => {
        if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
          return;
        }

        const nextOrder = swapItems(getPuzzleOrder(gallery), fromIndex, toIndex);
        puzzleOrders.set(gallery.slug, nextOrder);
        writePuzzleCookie(gallery.slug, nextOrder);
        selectedIndex = -1;
        syncIconGrid();
      };

      const clearDropTargets = () => {
        grid.querySelectorAll(".gallery-card.is-drop-target").forEach((card) => {
          card.classList.remove("is-drop-target");
        });
      };

      const handleIconTap = (tappedIndex) => {
        if (Number.isNaN(tappedIndex) || tappedIndex < 0) return;

        if (selectedIndex === tappedIndex) {
          selectedIndex = -1;
          clearSelectedCard();
          return;
        }

        if (selectedIndex >= 0) {
          commitIconSwap(selectedIndex, tappedIndex);
          return;
        }

        selectedIndex = tappedIndex;
        setSelectedCard(tappedIndex);
      };

      const syncIconGrid = () => {
        const orderedArtworks = getPuzzleOrder(gallery);
        const fragment = document.createDocumentFragment();

        orderedArtworks.forEach((artwork, index) => {
          let card = cardMap.get(artwork.fileName);
          if (!card) {
            card = createGalleryCard(artwork, artworkIndex + index, { disableLightbox: true });
            card.draggable = true;
            card.setAttribute("aria-pressed", "false");
            card.addEventListener("dragstart", (event) => {
              event.dataTransfer?.setData("text/plain", card.dataset.index || "-1");
              card.classList.add("is-dragging");
            });
            card.addEventListener("dragend", () => {
              card.classList.remove("is-dragging");
            });
            card.addEventListener("dragover", (event) => {
              event.preventDefault();
              card.classList.add("is-drop-target");
            });
            card.addEventListener("dragleave", () => {
              card.classList.remove("is-drop-target");
            });
            card.addEventListener("drop", (event) => {
              event.preventDefault();
              card.classList.remove("is-drop-target");
              const fromIndex = Number.parseInt(event.dataTransfer?.getData("text/plain") || "-1", 10);
              const toIndex = Number.parseInt(card.dataset.index || "-1", 10);
              commitIconSwap(fromIndex, toIndex);
            });
            card.addEventListener("click", (event) => {
              event.preventDefault();
              handleIconTap(Number.parseInt(card.dataset.index || "-1", 10));
            });
            cardMap.set(artwork.fileName, card);
          }

          card.dataset.index = String(index);
          fragment.appendChild(card);
        });

        grid.replaceChildren(fragment);
        setSelectedCard(selectedIndex);
      };

      syncIconGrid();
      artworkIndex += displayedArtworks.length;
    } else {
      const featuredIndices = pickFeaturedIndices(displayedArtworks, 0.1);
      displayedArtworks.forEach((artwork, index) => {
        grid.appendChild(createGalleryCard(artwork, artworkIndex, { featured: featuredIndices.has(index) }));
        artworkIndex += 1;
      });
    }

    bindMasonryGrid(grid);

    fragment.appendChild(section);
  });

  elements.galleryGroupsContainer.appendChild(fragment);
}

export function updateGallerySummary() {
  const isHomePage = Boolean(document.querySelector(".archive-preview-grid"));
  const selectedSeriesSlug = getSelectedSeriesSlug();
  const selectedGallery = selectedSeriesSlug
    ? state.galleries.find((gallery) => gallery.slug === selectedSeriesSlug) || null
    : null;

  if (elements.galleryPageEyebrow) {
    elements.galleryPageEyebrow.textContent = selectedGallery
      ? t("gallery.seriesEyebrow")
      : t("gallery.rootEyebrow");
  }

  if (elements.galleryPageTitle) {
    elements.galleryPageTitle.textContent = selectedGallery
      ? getGalleryTitle(selectedGallery)
      : t("gallery.rootTitle");
  }

  if (elements.gallerySummary) {
    if (isHomePage) {
      elements.gallerySummary.textContent = t("home.archive.summary", state.totalArtworks || state.artworks.length);
    } else if (selectedGallery) {
      elements.gallerySummary.textContent = getGalleryDescription(selectedGallery);
    } else {
      elements.gallerySummary.textContent = "";
    }
  }
}

export function refreshView() {
  refreshVisibleState();
  renderSeriesFilter();
  renderArchiveEntryLinks();
  renderHeroImages();
  updateGallerySummary();
  renderArchivePreview();
  renderGallery();
  bindReveal();
}
