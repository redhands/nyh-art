let galleries = [];
let artworks = [];
let visibleGalleries = [];
let visibleArtworks = [];
let revealObserver;
const i18nData = window.__NYH_I18N__ || {};
const translations = i18nData.translations || {};
const localeLabels = i18nData.localeLabels || { ko: "한국어" };
const supportedLocales = i18nData.supportedLocales || ["ko"];
let currentLocale = getPreferredLocale();

const galleryGroupsContainer = document.querySelector("#gallery-groups-container");
const gallerySummary = document.querySelector("#gallery-summary");
const galleryPageEyebrow = document.querySelector("#gallery-page-eyebrow");
const galleryPageTitle = document.querySelector("#gallery-page-title");
const archiveEntryLinks = document.querySelector("#archive-entry-links");
const seriesFilter = document.querySelector("#series-filter");
const heroImageMain = document.querySelector("#hero-image-main");
const heroImageTop = document.querySelector("#hero-image-top");
const heroImageBottom = document.querySelector("#hero-image-bottom");
const lightbox = document.querySelector("#lightbox");
const lightboxContent = document.querySelector(".lightbox-content");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxIndex = document.querySelector("#lightbox-index");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDescription = document.querySelector("#lightbox-description");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxClose = document.querySelector(".lightbox-close");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactPanel = document.querySelector("#contact-panel");
const contactTriggers = document.querySelectorAll(".nav-contact-trigger");
const localeSwitcher = document.querySelector(".locale-switcher");
const localeCurrentButton = document.querySelector(".locale-current-button");
const localeCurrentLabel = document.querySelector("#locale-current-label");
const localeSwitcherMenu = document.querySelector(".locale-switcher-menu");
const localeSwitcherButtons = document.querySelectorAll(".locale-switcher-button");
const backToTopButton = document.querySelector("#back-to-top");

function getPreferredLocale() {
  try {
    const savedLocale = window.localStorage.getItem("nyh-locale");
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      return savedLocale;
    }
  } catch {
    // Ignore storage errors and fall back to browser preferences.
  }

  return "ko";
}

function getTranslationValue(locale, key) {
  return key.split(".").reduce((value, segment) => value?.[segment], translations[locale]);
}

function getLocalizedContent(valueMap, fallbackValue = "") {
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

function getGalleryTitle(gallery) {
  return getLocalizedContent(gallery?.titleI18n, gallery?.title || "");
}

function getGalleryDescription(gallery) {
  return getLocalizedContent(gallery?.descriptionI18n, gallery?.description || "");
}

function getArtworkTitle(artwork) {
  return getLocalizedContent(artwork?.titleI18n, artwork?.title || "");
}

function getArtworkSubtitle(artwork) {
  return getLocalizedContent(artwork?.subtitleI18n, artwork?.subtitle || "");
}

function getArtworkDescription(artwork) {
  return getLocalizedContent(artwork?.descriptionI18n, artwork?.description || "");
}

function t(key, ...args) {
  const value =
    getTranslationValue(currentLocale, key) ??
    getTranslationValue("ko", key) ??
    key;

  return typeof value === "function" ? value(...args) : value;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  menuToggle?.setAttribute("aria-label", t("menu.button"));
  lightboxClose?.setAttribute("aria-label", t("common.close"));

  localeSwitcherButtons.forEach((button) => {
    const isActive = button.dataset.locale === currentLocale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (localeCurrentLabel) {
    localeCurrentLabel.textContent = localeLabels[currentLocale] || localeLabels.ko;
  }
}

function applyLocale() {
  applyStaticTranslations();

  if (galleries.length) {
    visibleGalleries = getFilteredGalleries();
    visibleArtworks = visibleGalleries.flatMap((gallery) => gallery.artworks || []);
    renderSeriesFilter();
    renderArchiveEntryLinks();
    updateGallerySummary();
    renderArchivePreview();
    renderGallery();
    bindReveal();
  }
}

function bindLocaleSwitcher() {
  localeCurrentButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isHidden = localeSwitcherMenu?.hasAttribute("hidden");

    if (isHidden) {
      localeSwitcherMenu?.removeAttribute("hidden");
      localeCurrentButton.setAttribute("aria-expanded", "true");
    } else {
      localeSwitcherMenu?.setAttribute("hidden", "");
      localeCurrentButton.setAttribute("aria-expanded", "false");
    }
  });

  localeSwitcherButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLocale = button.dataset.locale;
      if (!nextLocale || nextLocale === currentLocale) return;

      currentLocale = nextLocale;

      try {
        window.localStorage.setItem("nyh-locale", nextLocale);
      } catch {
        // Ignore storage errors and keep in-memory locale.
      }

      applyLocale();
      localeSwitcherMenu?.setAttribute("hidden", "");
      localeCurrentButton?.setAttribute("aria-expanded", "false");

      if (window.matchMedia("(max-width: 720px)").matches) {
        siteNav?.classList.remove("is-open");
        menuToggle?.setAttribute("aria-expanded", "false");
      }
    });
  });

  localeSwitcher?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    localeSwitcherMenu?.setAttribute("hidden", "");
    localeCurrentButton?.setAttribute("aria-expanded", "false");
  });
}

function getGalleryBySlug(slug) {
  return galleries.find((gallery) => gallery.slug === slug) || null;
}

function getThumbnailSizeClass(artwork) {
  const gallery = getGalleryBySlug(artwork.folder);
  const thumbnailSize = gallery?.thumbnailSize || "default";
  return `thumbnail-size-${thumbnailSize}`;
}

function getArtworkImageUrl(artwork) {
  return artwork.imageUrl || "";
}

function getGalleryDataSourceUrl() {
  const datasetUrl = document.body?.dataset.galleryUrl;
  if (datasetUrl) {
    return datasetUrl;
  }

  if (window.__NYH_GALLERY_URL__) {
    return window.__NYH_GALLERY_URL__;
  }

  return "data/gallery.json";
}

function getHomeUrl() {
  return document.body?.dataset.homeUrl || "index.html";
}

function getGalleryIndexUrl() {
  return document.body?.dataset.galleryIndexUrl || "gallery.html";
}

function getSeriesBaseUrl() {
  return document.body?.dataset.seriesBaseUrl || "series";
}

function getSeriesPageUrl(slug) {
  const baseUrl = getSeriesBaseUrl().replace(/\/+$/u, "");
  return `${baseUrl}/${encodeURIComponent(slug)}/`;
}

function getArtworkThumbnailMarkup(artwork, eager = false) {
  const loadingMode = eager ? "eager" : "lazy";
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork) || t("common.untitledArtwork");

  return `
    <div class="thumbnail-frame ${thumbnailSizeClass}">
      <img
        src="${getArtworkImageUrl(artwork)}"
        alt="${artworkTitle}"
        loading="${loadingMode}"
        decoding="async"
      />
    </div>
  `;
}

function createGalleryCard(artwork, index) {
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork);
  card.className = `gallery-card reveal ${thumbnailSizeClass}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artworkTitle || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);

  card.innerHTML = getArtworkThumbnailMarkup(artwork, index < 8);

  card.addEventListener("click", () => openLightboxForArtwork(artwork));
  return card;
}

function createArchivePreviewCard(artwork) {
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  const artworkTitle = getArtworkTitle(artwork);
  card.className = `archive-preview-card reveal ${thumbnailSizeClass}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artworkTitle || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);
  card.innerHTML = getArtworkThumbnailMarkup(artwork, true);
  card.addEventListener("click", () => openLightboxForArtwork(artwork));
  return card;
}

function pickRandomArtworks(count, source = artworks) {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArtworks(source = []) {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function renderHeroImages() {
  if (!heroImageMain || !heroImageTop || !heroImageBottom) return;

  const heroCandidates = artworks.filter(
    (artwork) => getThumbnailSizeClass(artwork) !== "thumbnail-size-icon"
  );
  const selected = pickRandomArtworks(3, heroCandidates.length ? heroCandidates : artworks);
  const targets = [heroImageMain, heroImageTop, heroImageBottom];

  selected.forEach((artwork, index) => {
    const target = targets[index];
    if (!target) return;

    target.src = getArtworkImageUrl(artwork);
    target.alt = getArtworkTitle(artwork) || t("common.untitledArtwork");
  });
}

function getSelectedSeriesSlug() {
  const datasetSeriesSlug = document.body?.dataset.selectedSeries;
  if (datasetSeriesSlug) {
    return datasetSeriesSlug;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("series") || "";
}

function getFilteredGalleries() {
  const selectedSeriesSlug = getSelectedSeriesSlug();
  if (!selectedSeriesSlug) {
    return galleries;
  }

  return galleries.filter((gallery) => gallery.slug === selectedSeriesSlug);
}

function renderArchivePreview() {
  const archivePreviewGrid = document.querySelector("#archive-preview-grid");
  if (!archivePreviewGrid) return;

  archivePreviewGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const archiveSource = galleries
    .filter((gallery) => gallery.showInArchive !== false)
    .flatMap((gallery) => gallery.artworks || []);

  const previewSource = archiveSource.length ? archiveSource : artworks;
  const selectedArtworks = pickRandomArtworks(8, previewSource).sort((left, right) => {
    const leftIsIcon = getThumbnailSizeClass(left) === "thumbnail-size-icon";
    const rightIsIcon = getThumbnailSizeClass(right) === "thumbnail-size-icon";

    if (leftIsIcon === rightIsIcon) {
      return 0;
    }

    return leftIsIcon ? 1 : -1;
  });

  selectedArtworks.forEach((artwork) => {
    fragment.appendChild(createArchivePreviewCard(artwork));
  });

  archivePreviewGrid.appendChild(fragment);
  bindPreviewMasonry(archivePreviewGrid);
}

function layoutPreviewMasonryItem(grid, item) {
  const computedStyle = window.getComputedStyle(grid);
  const rowHeight = Number.parseFloat(computedStyle.getPropertyValue("grid-auto-rows"));
  const rowGap = Number.parseFloat(computedStyle.getPropertyValue("gap"));

  if (!rowHeight) return;

  item.style.gridRowEnd = "auto";
  const contentHeight = item.getBoundingClientRect().height;
  const rowSpan = Math.max(1, Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap)));
  item.style.gridRowEnd = `span ${rowSpan}`;
}

function bindPreviewMasonry(grid) {
  if (!grid) return;

  const items = Array.from(grid.children);
  const relayout = () => {
    items.forEach((item) => layoutPreviewMasonryItem(grid, item));
  };

  items.forEach((item) => {
    const image = item.querySelector("img");
    if (!image) return;

    if (image.complete) {
      layoutPreviewMasonryItem(grid, item);
      return;
    }

    image.addEventListener("load", () => layoutPreviewMasonryItem(grid, item), { once: true });
    image.addEventListener("error", () => layoutPreviewMasonryItem(grid, item), { once: true });
  });

  requestAnimationFrame(relayout);
  window.setTimeout(relayout, 120);
  window.addEventListener("resize", relayout, { passive: true });
}

function renderSeriesFilter() {
  if (!seriesFilter) return;

  const selectedSeriesSlug = getSelectedSeriesSlug();
  const items = [
    {
      href: getGalleryIndexUrl(),
      label: t("common.allView"),
      active: !selectedSeriesSlug
    },
    ...galleries.map((gallery) => ({
      href: getSeriesPageUrl(gallery.slug),
      label: getGalleryTitle(gallery),
      active: selectedSeriesSlug === gallery.slug
    }))
  ];

  seriesFilter.innerHTML = items
    .map(
      (item) => `
        <a class="series-filter-link${item.active ? " is-active" : ""}" href="${item.href}">
          ${item.label}
        </a>
      `
    )
    .join("");
}

function renderArchiveEntryLinks() {
  if (!archiveEntryLinks || !galleries.length) return;

  const items = [
    `
      <a class="archive-entry-link archive-entry-link-primary" href="${getGalleryIndexUrl()}">
        <span class="archive-entry-icon" aria-hidden="true">+</span>
        <span>${t("common.wholeGallery")}</span>
      </a>
    `,
    ...galleries.map((gallery) => `
      <a
        class="archive-entry-link"
        href="${getSeriesPageUrl(gallery.slug)}"
      >
        <span class="archive-entry-icon" aria-hidden="true">+</span>
        <span>${getGalleryTitle(gallery)}</span>
      </a>
    `)
  ];

  archiveEntryLinks.innerHTML = items.join("");
}

function renderGallery() {
  if (!galleryGroupsContainer) return;

  galleryGroupsContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let artworkIndex = 0;

  visibleGalleries.forEach((gallery) => {
    const section = document.createElement("section");
    section.className = "gallery-group reveal";
    section.setAttribute("aria-labelledby", `gallery-group-${gallery.slug}`);
    section.id = `gallery-group-${gallery.slug}`;
    const galleryTitle = getGalleryTitle(gallery);
    const galleryDescription = getGalleryDescription(gallery);

    const description = galleryDescription
      ? `<p>${galleryDescription}</p>`
      : "";

    section.innerHTML = `
      <div class="gallery-group-header">
        <div>
          <p class="eyebrow">${t("gallery.seriesEyebrow")}</p>
          <h3>${galleryTitle}</h3>
          ${description}
        </div>
      </div>
      <div class="gallery-grid ${gallery.thumbnailSize === "icon" ? "gallery-grid-icon" : ""}"></div>
    `;

    const grid = section.querySelector(".gallery-grid");
    const displayedArtworks =
      gallery.thumbnailSize === "icon"
        ? pickRandomArtworks(gallery.artworks.length, gallery.artworks)
        : shuffleArtworks(gallery.artworks);

    displayedArtworks.forEach((artwork) => {
      grid.appendChild(createGalleryCard(artwork, artworkIndex));
      artworkIndex += 1;
    });

    fragment.appendChild(section);
  });

  galleryGroupsContainer.appendChild(fragment);
}

function updateGallerySummary() {
  const isHomePage = Boolean(document.querySelector(".archive-preview-grid"));
  const selectedSeriesSlug = getSelectedSeriesSlug();
  const selectedGallery = selectedSeriesSlug ? getGalleryBySlug(selectedSeriesSlug) : null;

  if (galleryPageEyebrow) {
    galleryPageEyebrow.textContent = selectedGallery
      ? t("gallery.seriesEyebrow")
      : t("gallery.rootEyebrow");
  }

  if (galleryPageTitle) {
    galleryPageTitle.textContent = selectedGallery
      ? getGalleryTitle(selectedGallery)
      : t("gallery.rootTitle");
  }

  if (gallerySummary) {
    if (isHomePage) {
      gallerySummary.textContent = t("home.archive.summary", artworks.length);
    } else if (selectedGallery) {
      gallerySummary.textContent = getGalleryDescription(selectedGallery);
    } else {
      gallerySummary.textContent = "";
    }
  }
}

function hasArtworkMetadata(artwork) {
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

function hasArtworkTitle(artwork) {
  if (!artwork) return false;

  const title = String(getArtworkTitle(artwork) || "").trim();
  if (!title) return false;

  return !/^작품 \d+$/u.test(title);
}

function openLightboxForArtwork(artwork) {
  if (!artwork) return;

  const showTitle = hasArtworkTitle(artwork);
  const artworkTitle = getArtworkTitle(artwork);

  lightboxImage.src = getArtworkImageUrl(artwork);
  lightboxImage.alt = artworkTitle || t("common.untitledArtwork");
  lightboxIndex.textContent = "";
  lightboxDescription.textContent = "";
  lightboxTitle.textContent = showTitle ? artworkTitle : "";
  lightboxMeta?.toggleAttribute("hidden", !showTitle);
  lightboxContent?.classList.toggle("lightbox-content-image-only", !showTitle);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  lightboxMeta?.removeAttribute("hidden");
  lightboxContent?.classList.remove("lightbox-content-image-only");
  document.body.style.overflow = "";
}

function bindLightbox() {
  lightboxClose?.addEventListener("click", closeLightbox);

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}

function bindMenu() {
  menuToggle?.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });
}

function bindImageProtection() {
  document.addEventListener("contextmenu", (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.preventDefault();
    }
  });
}

function adjustHashScroll() {
  const hash = window.location.hash;
  if (!hash) return;

  const target = document.querySelector(hash);
  if (!target) return;

  const navHeight = siteNav?.getBoundingClientRect().height || 0;
  const extraOffset = 28;
  const top =
    window.scrollY +
    target.getBoundingClientRect().top -
    navHeight -
    extraOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth"
  });
}

function bindHashScrollFix() {
  if (!window.location.hash) return;

  requestAnimationFrame(adjustHashScroll);
  window.setTimeout(adjustHashScroll, 180);
  window.setTimeout(adjustHashScroll, 520);
  window.addEventListener("load", adjustHashScroll, { once: true });
  window.addEventListener("hashchange", adjustHashScroll);
}

function closeContactPanel() {
  if (!contactPanel) return;

  contactPanel.setAttribute("hidden", "");
  contactTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
  });
}

function openContactPanel() {
  if (!contactPanel) return;

  contactPanel.removeAttribute("hidden");
  contactTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "true");
  });
}

function bindContactPanel() {
  if (!contactPanel || !contactTriggers.length) return;

  contactTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isHidden = contactPanel.hasAttribute("hidden");

      if (isHidden) {
        openContactPanel();
      } else {
        closeContactPanel();
      }
    });
  });

  contactPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    closeContactPanel();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeContactPanel();
    }
  });
}

function bindBackToTop() {
  if (!backToTopButton) return;

  const toggleVisibility = () => {
    backToTopButton.classList.toggle("is-visible", window.scrollY > 520);
  };

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  toggleVisibility();
  window.addEventListener("scroll", toggleVisibility, { passive: true });
  window.addEventListener("resize", toggleVisibility, { passive: true });
}

function bindReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!revealElements.length) return;

  const revealVisibleElements = () => {
    revealElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isInViewport =
        rect.top < window.innerHeight * 1.08 &&
        rect.bottom > window.innerHeight * -0.12;

      if (isInViewport) {
        element.classList.add("is-visible");
        revealObserver?.unobserve(element);
      }
    });
  };

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        }
      });
    },
    {
      threshold: [0, 0.12, 0.24],
      rootMargin: "20% 0px 20% 0px"
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));

  requestAnimationFrame(revealVisibleElements);
  window.setTimeout(revealVisibleElements, 160);
  window.addEventListener("load", revealVisibleElements, { once: true });
  window.addEventListener("pageshow", revealVisibleElements);
  window.addEventListener("resize", revealVisibleElements, { passive: true });
}

async function loadGallery() {
  if (window.__NYH_GALLERY__ && Array.isArray(window.__NYH_GALLERY__.galleries)) {
    galleries = window.__NYH_GALLERY__.galleries;
    artworks = galleries.flatMap((gallery) => gallery.artworks || []);
    visibleGalleries = getFilteredGalleries();
    visibleArtworks = visibleGalleries.flatMap((gallery) => gallery.artworks || []);
    renderSeriesFilter();
    renderArchiveEntryLinks();
    renderHeroImages();
    updateGallerySummary();
    renderArchivePreview();
    renderGallery();
    bindReveal();
    return;
  }

  try {
    const response = await fetch(getGalleryDataSourceUrl(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    galleries = Array.isArray(data.galleries) ? data.galleries : [];
    artworks = galleries.flatMap((gallery) => gallery.artworks || []);
    visibleGalleries = getFilteredGalleries();
    visibleArtworks = visibleGalleries.flatMap((gallery) => gallery.artworks || []);
    renderSeriesFilter();
    renderArchiveEntryLinks();
    renderHeroImages();
    updateGallerySummary();
    renderArchivePreview();
    renderGallery();
    bindReveal();
  } catch (error) {
    console.error("갤러리 데이터를 불러오지 못했습니다.", error);

    if (gallerySummary) {
      gallerySummary.textContent = t("gallery.loadError");
    }
  }
}

applyLocale();
bindLightbox();
bindMenu();
bindImageProtection();
bindContactPanel();
bindLocaleSwitcher();
bindBackToTop();
bindHashScrollFix();
loadGallery();
