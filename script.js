let galleries = [];
let artworks = [];
let visibleGalleries = [];
let visibleArtworks = [];
let revealObserver;

const galleryGroupsContainer = document.querySelector("#gallery-groups-container");
const galleryCount = document.querySelector("#gallery-count");
const gallerySummary = document.querySelector("#gallery-summary");
const galleryGroups = document.querySelector("#gallery-groups");
const seriesFilter = document.querySelector("#series-filter");
const heroImageMain = document.querySelector("#hero-image-main");
const heroImageTop = document.querySelector("#hero-image-top");
const heroImageBottom = document.querySelector("#hero-image-bottom");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxIndex = document.querySelector("#lightbox-index");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDescription = document.querySelector("#lightbox-description");
const lightboxClose = document.querySelector(".lightbox-close");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

function getGalleryBySlug(slug) {
  return galleries.find((gallery) => gallery.slug === slug) || null;
}

function getThumbnailSizeClass(artwork) {
  const gallery = getGalleryBySlug(artwork.folder);
  const thumbnailSize = gallery?.thumbnailSize || "default";
  return `thumbnail-size-${thumbnailSize}`;
}

function getArtworkThumbnailMarkup(artwork, eager = false) {
  const loadingMode = eager ? "eager" : "lazy";
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);

  return `
    <div class="thumbnail-frame ${thumbnailSizeClass}">
      <img
        src="artworks/${artwork.imagePath}"
        alt="${artwork.title}"
        loading="${loadingMode}"
        decoding="async"
      />
    </div>
  `;
}

function createGalleryCard(artwork, index) {
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  card.className = `gallery-card reveal ${thumbnailSizeClass}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artwork.title} 확대 보기`);

  card.innerHTML = getArtworkThumbnailMarkup(artwork, index < 8);

  card.addEventListener("click", () => openLightboxForArtwork(artwork));
  return card;
}

function createArchivePreviewCard(artwork) {
  const card = document.createElement("a");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  card.className = `archive-preview-card reveal ${thumbnailSizeClass}`;
  card.href = `gallery.html?series=${encodeURIComponent(artwork.folder)}#gallery-group-${artwork.folder}`;
  card.setAttribute("aria-label", `${artwork.title}이 있는 ${artwork.folder} 시리즈로 이동`);
  card.innerHTML = getArtworkThumbnailMarkup(artwork, true);
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

    target.src = `artworks/${artwork.imagePath}`;
    target.alt = artwork.title;
  });
}

function getSelectedSeriesSlug() {
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

  const selectedArtworks = pickRandomArtworks(8).sort((left, right) => {
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
      href: "gallery.html",
      label: "전체 보기",
      active: !selectedSeriesSlug
    },
    ...galleries.map((gallery) => ({
      href: `gallery.html?series=${encodeURIComponent(gallery.slug)}#gallery-group-${gallery.slug}`,
      label: gallery.title,
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

    const description = gallery.description
      ? `<p>${gallery.description}</p>`
      : "";

    section.innerHTML = `
      <div class="gallery-group-header">
        <div>
          <p class="eyebrow">시리즈</p>
          <h3>${gallery.title}</h3>
          ${description}
        </div>
        <div class="gallery-group-actions">
          <span class="pill">${gallery.total}점</span>
          <a class="series-direct-link" href="gallery.html?series=${encodeURIComponent(gallery.slug)}#gallery-group-${gallery.slug}">
            시리즈 링크
          </a>
        </div>
      </div>
      <div class="gallery-grid ${gallery.thumbnailSize === "icon" ? "gallery-grid-icon" : ""}"></div>
    `;

    const grid = section.querySelector(".gallery-grid");
    const displayedArtworks =
      gallery.thumbnailSize === "icon"
        ? pickRandomArtworks(gallery.artworks.length, gallery.artworks)
        : gallery.artworks;

    displayedArtworks.forEach((artwork) => {
      grid.appendChild(createGalleryCard(artwork, artworkIndex));
      artworkIndex += 1;
    });

    fragment.appendChild(section);
  });

  galleryGroupsContainer.appendChild(fragment);
}

function updateGallerySummary() {
  if (galleryCount) {
    galleryCount.textContent = `총 ${visibleArtworks.length}점`;
  }

  if (galleryGroups) {
    galleryGroups.textContent = `총 ${visibleGalleries.length}개 시리즈`;
  }

  if (gallerySummary) {
    gallerySummary.textContent = document.querySelector(".archive-preview-grid")
      ? `현재 등록된 ${artworks.length}점의 작품 중 화면 안에 오래 머무는 장면들을 랜덤으로 소개합니다. 카드를 누르면 해당 시리즈가 열린 전체 갤러리 페이지로 이동합니다.`
      : getSelectedSeriesSlug()
        ? `선택한 시리즈의 작품 ${visibleArtworks.length}점을 보고 있습니다. 하나의 흐름 안에서 이어지는 장면들을 천천히 감상해 보세요. 상단 필터를 이용하면 다른 시리즈나 전체 보기로 돌아갈 수 있습니다.`
        : `현재 등록된 ${visibleArtworks.length}점의 작품을 시리즈별 흐름에 따라 감상할 수 있습니다. 각 하위 폴더의 artworks.md에서 시리즈 제목과 설명을 읽어오며, 작품 정보는 이미지와 같은 이름의 마크다운 파일에서 관리됩니다. 카드를 누르면 큰 화면으로 확대해서 볼 수 있습니다.`;
  }
}

function openLightboxForArtwork(artwork) {
  if (!artwork) return;

  lightboxImage.src = `artworks/${artwork.imagePath}`;
  lightboxImage.alt = artwork.title;
  lightboxIndex.textContent = artwork.subtitle;
  lightboxTitle.textContent = artwork.title;
  lightboxDescription.textContent = artwork.description;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
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
    renderHeroImages();
    updateGallerySummary();
    renderArchivePreview();
    renderGallery();
    bindReveal();
    return;
  }

  try {
    const response = await fetch("data/gallery.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    galleries = Array.isArray(data.galleries) ? data.galleries : [];
    artworks = galleries.flatMap((gallery) => gallery.artworks || []);
    visibleGalleries = getFilteredGalleries();
    visibleArtworks = visibleGalleries.flatMap((gallery) => gallery.artworks || []);
    renderSeriesFilter();
    renderHeroImages();
    updateGallerySummary();
    renderArchivePreview();
    renderGallery();
    bindReveal();
  } catch (error) {
    console.error("갤러리 데이터를 불러오지 못했습니다.", error);

    if (gallerySummary) {
      gallerySummary.textContent =
        "갤러리 데이터를 불러오지 못했습니다. data/gallery.json 파일이 생성되어 있는지 확인해 주세요.";
    }
  }
}

bindLightbox();
bindMenu();
loadGallery();
