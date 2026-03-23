const artworks = [
  "DSC_0179.jpg",
  "DSC_0180.jpg",
  "DSC_0181.jpg",
  "DSC_0182.jpg",
  "DSC_0183.jpg",
  "DSC_0184.jpg",
  "DSC_0185.jpg",
  "DSC_0186.jpg",
  "DSC_0187.jpg",
  "DSC_0188.jpg",
  "DSC_0189.jpg",
  "DSC_0190.jpg",
  "DSC_0191.jpg",
  "DSC_0192.jpg",
  "DSC_0193.jpg",
  "DSC_0194.jpg",
  "DSC_0367.jpg",
  "DSC_0368.jpg",
  "DSC_0369.jpg",
  "DSC_0370.jpg",
  "DSC_0371.jpg",
  "DSC_0377.jpg",
  "DSC_0378.jpg",
  "DSC_0379.jpg",
].map((fileName, index) => ({
  fileName,
  title: `Artwork ${String(index + 1).padStart(2, "0")}`,
  subtitle: `Archive ${String(index + 1).padStart(2, "0")}`,
  description:
    "현재는 임시 아카이브 표기입니다. 실제 작품명, 제작년도, 재료 정보가 확정되면 이 데이터만 바꿔서 바로 반영할 수 있습니다.",
}));

const galleryGrid = document.querySelector("#gallery-grid");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxIndex = document.querySelector("#lightbox-index");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDescription = document.querySelector("#lightbox-description");
const lightboxClose = document.querySelector(".lightbox-close");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

function createGalleryCard(artwork, index) {
  const card = document.createElement("button");
  card.className = "gallery-card reveal";
  card.type = "button";
  card.setAttribute("aria-label", `${artwork.title} 확대 보기`);

  card.innerHTML = `
    <img src="artworks/${artwork.fileName}" alt="${artwork.title}" loading="lazy" />
    <div class="gallery-meta">
      <p>${artwork.subtitle}</p>
      <h3>${artwork.title}</h3>
    </div>
  `;

  card.addEventListener("click", () => openLightbox(index));
  return card;
}

function renderGallery() {
  if (!galleryGrid) return;

  const fragment = document.createDocumentFragment();
  artworks.forEach((artwork, index) => {
    fragment.appendChild(createGalleryCard(artwork, index));
  });
  galleryGrid.appendChild(fragment);
}

function openLightbox(index) {
  const artwork = artworks[index];
  if (!artwork) return;

  lightboxImage.src = `artworks/${artwork.fileName}`;
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
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealElements.forEach((element) => observer.observe(element));
}

renderGallery();
bindLightbox();
bindMenu();
bindReveal();
