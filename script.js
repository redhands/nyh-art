let galleries = [];
let artworks = [];
let visibleGalleries = [];
let visibleArtworks = [];
let revealObserver;
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

const translations = {
  ko: {
    brand: { subtitle: "온라인 갤러리" },
    menu: { button: "메뉴" },
    nav: { about: "작가 소개", notes: "작품 세계", gallery: "갤러리", contact: "Contact" },
    common: { close: "닫기", allView: "전체 보기", wholeGallery: "전체 갤러리 보기", seriesLink: "시리즈 링크", untitledArtwork: "작품", viewArtwork: "확대 보기", backToTop: "맨 위로" },
    contact: { label: "Contact" },
    home: {
      hero: {
        eyebrow: "NYH의 감성 갤러리",
        title: "꿈결 조각 모음",
        body: "이 곳은 바다, 해파리, 돌고래와 별빛 같은 상징을 따라 마음의 풍경을 그려내는 온라인 전시 공간입니다. 화면 안을 천천히 흐르는 장면들을 따라가다 보면, 작가가 지나온 시간과 감정의 결을 함께 마주하게 됩니다.",
        primaryAction: "작품 감상하기",
        secondaryAction: "작가 소개 보기",
        noteSea: "바다",
        noteDream: "꿈",
        noteStarlight: "별빛",
        noteComfort: "위로"
      },
      archive: {
        eyebrow: "갤러리",
        title: "작품 모음",
        summary: (count) => `현재 등록된 ${count}점의 작품 중 화면 안에 오래 머무는 장면들을 랜덤으로 소개합니다. 카드를 누르면 작품을 크게 볼 수 있고, 전체 갤러리는 바로가기 버튼으로 이동할 수 있습니다.`
      },
      about: {
        eyebrow: "작가 소개",
        title: "흘러가는 순간을 그림으로 붙잡아 모으는 마음",
        body1: "세상 모든 것은 멈추지 않고 그저 흘러갑니다. 붙잡을 수 없는 시간의 무심함 속에서 꿈을 꾸는 찰나의 순간들을 흘려보내지 않고, 그림의 형태로 잡아 모아 기록해봅니다.",
        body2: "꿈결 같은 이미지의 조각모음들을 통해 그림을 보시는 분들도 마음 한 켠에 간직한 꿈을 떠올리고, 작품 속에서 작은 위로와 환기를 얻으시기를 소망합니다."
      },
      notes: {
        eyebrow: "작품 세계",
        title: "작품을 이루는 장면들",
        seaTitle: "바다",
        seaBody: "바다는 작가에게 주어진 환경이자 모든 장면을 감싸는 커다란 배경입니다. 화면 안의 존재들은 그 흐름 속을 천천히 지나가며, 삶의 시간과 마음의 결을 함께 품고 있습니다.",
        jellyfishTitle: "해파리",
        jellyfishBody: "해파리는 유연한 마음의 상징입니다. 물결을 거스르기보다 흐름에 몸을 맡기며 움직이는 모습은, 흔들리면서도 다시 나아가는 마음의 형태를 닮아 있습니다.",
        dolphinTitle: "돌고래",
        dolphinBody: "돌고래는 무한한 애정을 상징합니다. 화면 속에서 인물을 감싸고 함께 머무는 존재로 나타나며, 따뜻한 위로와 다정한 관계의 감각을 조용히 전합니다."
      }
    },
    gallery: {
      rootEyebrow: "전체 아카이브",
      rootTitle: "어디론가 흘러가는 중.🌙",
      rootSummary: "바다를 지나 해파리와 돌고래를 만나고, 다시 별빛을 향해 흘러가는 장면들을 시리즈별로 모아둔 아카이브입니다.",
      seriesEyebrow: "시리즈",
      count: (count) => `${count}점`,
      loadError: "갤러리 데이터를 불러오지 못했습니다. 외부 gallery.json 경로와 접근 권한을 확인해 주세요."
    }
  },
  zh: {
    brand: { subtitle: "線上畫廊" },
    menu: { button: "選單" },
    nav: { about: "作家介紹", notes: "作品世界", gallery: "畫廊", contact: "聯絡" },
    common: { close: "關閉", allView: "全部", wholeGallery: "查看完整畫廊", seriesLink: "系列頁面", untitledArtwork: "作品", viewArtwork: "放大查看", backToTop: "回到頂端" },
    contact: { label: "聯絡" },
    home: {
      hero: {
        eyebrow: "NYH 的感性畫廊",
        title: "夢境碎片集",
        body: "這裡是一處沿著海、水母、海豚與星光等象徵描繪心靈風景的線上展覽空間。沿著畫面中緩緩流動的場景前行，也會遇見藝術家走過的時間與情感紋理。",
        primaryAction: "欣賞作品",
        secondaryAction: "查看作家介紹",
        noteSea: "海",
        noteDream: "夢",
        noteStarlight: "星光",
        noteComfort: "慰藉"
      },
      archive: {
        eyebrow: "畫廊",
        title: "作品集合",
        summary: (count) => `這裡會從目前收錄的 ${count} 件作品中隨機展示一些久久停留在心中的片段。點擊卡片可以放大觀看，也可以透過下方連結進入完整畫廊。`
      },
      about: {
        eyebrow: "作家介紹",
        title: "把流逝的瞬間收集成繪畫的心",
        body1: "世上的一切都不會停下，只是不斷流逝。在無法抓住的時間冷靜流動之中，我不願讓那些如夢般短暫的瞬間就這樣流走，而是把它們收攏並以繪畫的形式記錄下來。",
        body2: "希望這些如夢般的圖像碎片，也能讓觀者想起自己心底珍藏的夢想，並從作品之中獲得一點點慰藉與換氣般的清新感。"
      },
      notes: {
        eyebrow: "作品世界",
        title: "構成作品的場景",
        seaTitle: "海",
        seaBody: "海既是藝術家被賦予的環境，也是包圍所有場景的巨大背景。畫面中的存在沿著這股流動緩慢前行，同時承載著時間與情感的紋理。",
        jellyfishTitle: "水母",
        jellyfishBody: "水母象徵柔軟而有彈性的內心。它不逆流而行，而是順著水流漂動，那姿態就像一顆雖會搖晃卻仍繼續前行的心。",
        dolphinTitle: "海豚",
        dolphinBody: "海豚象徵無限的愛意。它在畫面中作為包圍並陪伴人物的存在出現，靜靜傳遞著溫暖、安慰與溫柔的關係感。"
      }
    },
    gallery: {
      rootEyebrow: "檔案",
      rootTitle: "正在流向某處。🌙",
      rootSummary: "這是一個按系列整理的檔案，收集了從海、水母、海豚，再次流向星光的那些場景。",
      seriesEyebrow: "系列",
      count: (count) => `${count} 件作品`,
      loadError: "無法載入畫廊資料。請檢查外部 gallery.json 路徑與存取權限。"
    }
  },
  en: {
    brand: { subtitle: "Online Gallery" },
    menu: { button: "Menu" },
    nav: { about: "About", notes: "World", gallery: "Gallery", contact: "Contact" },
    common: { close: "Close", allView: "All", wholeGallery: "View Full Gallery", seriesLink: "Series Page", untitledArtwork: "Artwork", viewArtwork: "Open larger view", backToTop: "Back to top" },
    contact: { label: "Contact" },
    home: {
      hero: {
        eyebrow: "NYH's Poetic Gallery",
        title: "Dreamlike Fragments",
        body: "This is an online exhibition space that paints emotional landscapes through symbols such as the sea, jellyfish, dolphins, and starlight. As you follow the scenes drifting slowly across the screen, you encounter the artist's passing time and emotional textures.",
        primaryAction: "View the Works",
        secondaryAction: "Meet the Artist",
        noteSea: "Sea",
        noteDream: "Dream",
        noteStarlight: "Starlight",
        noteComfort: "Comfort"
      },
      archive: {
        eyebrow: "Gallery",
        title: "Collection of Works",
        summary: (count) => `A rotating selection from the current ${count} works is shown here first. Tap a card to view it larger, or move into the full gallery through the links below.`
      },
      about: {
        eyebrow: "About",
        title: "Gathering fleeting moments into paintings",
        body1: "Everything in the world keeps flowing without pause. Within the indifference of time that cannot be held, these brief moments of dreaming are gathered and recorded in the form of paintings instead of being allowed to slip away.",
        body2: "Through these dreamlike fragments of imagery, I hope viewers also remember the dreams they keep within and find a small sense of comfort and renewal in the works."
      },
      notes: {
        eyebrow: "World of the Works",
        title: "Scenes That Shape the Works",
        seaTitle: "Sea",
        seaBody: "The sea is both the environment given to the artist and the broad setting that embraces every scene. The beings within it move slowly through its currents, carrying the textures of time and feeling.",
        jellyfishTitle: "Jellyfish",
        jellyfishBody: "The jellyfish symbolizes a flexible heart. Moving with the current rather than resisting it, it resembles a mind that trembles yet continues forward.",
        dolphinTitle: "Dolphin",
        dolphinBody: "The dolphin symbolizes boundless affection. Appearing as a presence that surrounds and stays beside the figure, it quietly conveys warmth, comfort, and tenderness."
      }
    },
    gallery: {
      rootEyebrow: "Archive",
      rootTitle: "Drifting Somewhere.🌙",
      rootSummary: "An archive that gathers scenes flowing from the sea through jellyfish and dolphins, and onward toward starlight, arranged by series.",
      seriesEyebrow: "Series",
      count: (count) => `${count} works`,
      loadError: "The gallery data could not be loaded. Please check the external gallery.json path and access settings."
    }
  },
  ja: {
    brand: { subtitle: "オンラインギャラリー" },
    menu: { button: "メニュー" },
    nav: { about: "作家紹介", notes: "作品世界", gallery: "ギャラリー", contact: "コンタクト" },
    common: { close: "閉じる", allView: "すべて", wholeGallery: "ギャラリー全体を見る", seriesLink: "シリーズページ", untitledArtwork: "作品", viewArtwork: "拡大表示", backToTop: "トップへ" },
    contact: { label: "コンタクト" },
    home: {
      hero: {
        eyebrow: "NYHの感性ギャラリー",
        title: "夢のかけら集め",
        body: "ここは海、クラゲ、イルカ、星明かりのような象徴をたどりながら、心の風景を描いていくオンライン展示空間です。画面の中をゆっくり流れていく場面を追っていくと、作家が通り過ぎてきた時間と感情の結び目に出会えます。",
        primaryAction: "作品を見る",
        secondaryAction: "作家紹介を見る",
        noteSea: "海",
        noteDream: "夢",
        noteStarlight: "星明かり",
        noteComfort: "慰め"
      },
      archive: {
        eyebrow: "ギャラリー",
        title: "作品コレクション",
        summary: (count) => `現在登録されている${count}点の作品の中から、長く心に残る場面をランダムに紹介しています。カードを押すと大きく表示され、下のリンクから全体ギャラリーにも進めます。`
      },
      about: {
        eyebrow: "作家紹介",
        title: "流れていく瞬間を絵として集める心",
        body1: "世の中のすべては止まらずにただ流れていきます。つかまえることのできない時間の無情さの中で、夢を見る刹那の瞬間を流してしまわず、絵という形で集めて記録しています。",
        body2: "夢のようなイメージのかけらを通して、ご覧になる方々も心の片隅にしまっている夢を思い出し、作品の中で小さな慰めと換気のような感覚を得ていただけたらと願っています。"
      },
      notes: {
        eyebrow: "作品世界",
        title: "作品を形づくる場面",
        seaTitle: "海",
        seaBody: "海は作家に与えられた環境であり、すべての場面を抱きしめる大きな背景です。画面の中の存在たちはその流れの中をゆっくりと進み、時間と感情の質感をともに抱えています。",
        jellyfishTitle: "クラゲ",
        jellyfishBody: "クラゲはしなやかな心の象徴です。流れに逆らうのではなく身を任せて進む姿は、揺れながらもまた前へ進む心のかたちに似ています。",
        dolphinTitle: "イルカ",
        dolphinBody: "イルカは尽きることのない愛情を象徴します。人物を包み込み、ともに留まる存在として現れ、温かな慰めとやさしい関係の感覚を静かに伝えます。"
      }
    },
    gallery: {
      rootEyebrow: "アーカイブ",
      rootTitle: "どこかへ流れている途中。🌙",
      rootSummary: "海を過ぎ、クラゲやイルカに出会い、再び星明かりへと流れていく場面をシリーズごとに集めたアーカイブです。",
      seriesEyebrow: "シリーズ",
      count: (count) => `${count}点`,
      loadError: "ギャラリーデータを読み込めませんでした。外部 gallery.json のパスとアクセス権限を確認してください。"
    }
  }
};

const localeLabels = {
  ko: "한국어",
  zh: "中文",
  ja: "日本語",
  en: "EN"
};

function getPreferredLocale() {
  try {
    const savedLocale = window.localStorage.getItem("nyh-locale");
    if (savedLocale && ["ko", "zh", "ja", "en"].includes(savedLocale)) {
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

  return `
    <div class="thumbnail-frame ${thumbnailSizeClass}">
      <img
        src="${getArtworkImageUrl(artwork)}"
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
  card.setAttribute("aria-label", `${artwork.title || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);

  card.innerHTML = getArtworkThumbnailMarkup(artwork, index < 8);

  card.addEventListener("click", () => openLightboxForArtwork(artwork));
  return card;
}

function createArchivePreviewCard(artwork) {
  const card = document.createElement("button");
  const thumbnailSizeClass = getThumbnailSizeClass(artwork);
  card.className = `archive-preview-card reveal ${thumbnailSizeClass}`;
  card.type = "button";
  card.setAttribute("aria-label", `${artwork.title || t("common.untitledArtwork")} ${t("common.viewArtwork")}`);
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
    target.alt = artwork.title;
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
        <span>${gallery.title}</span>
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

    const description = gallery.description
      ? `<p>${gallery.description}</p>`
      : "";

    section.innerHTML = `
      <div class="gallery-group-header">
        <div>
          <p class="eyebrow">${t("gallery.seriesEyebrow")}</p>
          <h3>${gallery.title}</h3>
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
      ? selectedGallery.title
      : t("gallery.rootTitle");
  }

  if (gallerySummary) {
    if (isHomePage) {
      gallerySummary.textContent = t("home.archive.summary", artworks.length);
    } else if (selectedGallery?.description) {
      gallerySummary.textContent = selectedGallery.description;
    } else {
      gallerySummary.textContent = "";
    }
  }
}

function hasArtworkMetadata(artwork) {
  if (!artwork) return false;

  const hasFallbackTitle = /^작품 \d+$/u.test(String(artwork.title || "").trim());
  const hasFallbackSubtitle = /^아카이브 \d+$/u.test(String(artwork.subtitle || "").trim());
  const hasFallbackDescription =
    String(artwork.description || "").trim() === "설명이 아직 등록되지 않은 작품입니다.";

  const hasCustomTitle = Boolean(artwork.title) && !hasFallbackTitle;
  const hasCustomSubtitle = Boolean(artwork.subtitle) && !hasFallbackSubtitle;
  const hasCustomDescription = Boolean(artwork.description) && !hasFallbackDescription;
  const hasExtraMetadata = Boolean(artwork.medium || artwork.size || artwork.year);

  return hasCustomTitle || hasCustomSubtitle || hasCustomDescription || hasExtraMetadata;
}

function hasArtworkTitle(artwork) {
  if (!artwork) return false;

  const title = String(artwork.title || "").trim();
  if (!title) return false;

  return !/^작품 \d+$/u.test(title);
}

function openLightboxForArtwork(artwork) {
  if (!artwork) return;

  const showTitle = hasArtworkTitle(artwork);

  lightboxImage.src = getArtworkImageUrl(artwork);
  lightboxImage.alt = artwork.title || t("common.untitledArtwork");
  lightboxIndex.textContent = "";
  lightboxDescription.textContent = "";
  lightboxTitle.textContent = showTitle ? artwork.title : "";
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
