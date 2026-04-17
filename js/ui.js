import { elements } from "./dom.js";
import { state } from "./store.js";
import { t } from "./i18n.js";
import {
  getArtworkDescription,
  getArtworkImageUrl,
  getArtworkTitle,
  hasArtworkTitle
} from "./content.js";

let revealObserver;
let revealListenersBound = false;

export function openLightboxForArtwork(artwork) {
  if (!artwork) return;

  const showTitle = hasArtworkTitle(artwork);
  const artworkTitle = getArtworkTitle(artwork);

  elements.lightboxImage.src = getArtworkImageUrl(artwork);
  elements.lightboxImage.alt = artworkTitle || t("common.untitledArtwork");
  elements.lightboxIndex.textContent = "";
  elements.lightboxDescription.textContent = "";
  elements.lightboxTitle.textContent = showTitle ? artworkTitle : "";
  elements.lightboxMeta?.toggleAttribute("hidden", !showTitle);
  elements.lightboxContent?.classList.toggle("lightbox-content-image-only", !showTitle);
  elements.lightbox?.classList.add("is-open");
  elements.lightbox?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function closeLightbox() {
  elements.lightbox?.classList.remove("is-open");
  elements.lightbox?.setAttribute("aria-hidden", "true");
  elements.lightboxImage.src = "";
  elements.lightboxMeta?.removeAttribute("hidden");
  elements.lightboxContent?.classList.remove("lightbox-content-image-only");
  document.body.style.overflow = "";
}

export function bindLightbox() {
  elements.lightboxClose?.addEventListener("click", closeLightbox);

  elements.lightbox?.addEventListener("click", (event) => {
    if (event.target === elements.lightbox) {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.lightbox?.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}

export function bindMenu() {
  elements.menuToggle?.addEventListener("click", () => {
    const isOpen = elements.siteNav?.classList.toggle("is-open");
    elements.menuToggle?.setAttribute("aria-expanded", String(isOpen));
  });

  elements.siteNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      elements.siteNav?.classList.remove("is-open");
      elements.menuToggle?.setAttribute("aria-expanded", "false");
    });
  });
}

export function bindImageProtection() {
  const isProtectedImage = (target) => target instanceof HTMLImageElement;

  document.addEventListener("contextmenu", (event) => {
    if (isProtectedImage(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (isProtectedImage(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener(
    "touchstart",
    (event) => {
      if (!isProtectedImage(event.target)) return;

      event.target.setAttribute("draggable", "false");
    },
    { passive: true }
  );

  document.addEventListener("selectstart", (event) => {
    if (isProtectedImage(event.target)) {
      event.preventDefault();
    }
  });
}

function closeContactPanel() {
  if (!elements.contactPanel) return;

  elements.contactPanel.setAttribute("hidden", "");
  elements.contactTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
  });
}

function openContactPanel() {
  if (!elements.contactPanel) return;

  elements.contactPanel.removeAttribute("hidden");
  elements.contactTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "true");
  });
}

export function bindContactPanel() {
  if (!elements.contactPanel || !elements.contactTriggers.length) return;

  elements.contactTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isHidden = elements.contactPanel.hasAttribute("hidden");

      if (isHidden) {
        openContactPanel();
      } else {
        closeContactPanel();
      }
    });
  });

  elements.contactPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", closeContactPanel);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeContactPanel();
    }
  });
}

export function bindBackToTop() {
  if (!elements.backToTopButton) return;

  const toggleVisibility = () => {
    elements.backToTopButton.classList.toggle("is-visible", window.scrollY > 520);
  };

  elements.backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  toggleVisibility();
  window.addEventListener("scroll", toggleVisibility, { passive: true });
  window.addEventListener("resize", toggleVisibility, { passive: true });
}

function adjustHashScroll() {
  const hash = window.location.hash;
  if (!hash) return;

  const target = document.querySelector(hash);
  if (!target) return;

  const navHeight = elements.siteNav?.getBoundingClientRect().height || 0;
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

export function bindHashScrollFix() {
  if (!window.location.hash) return;

  requestAnimationFrame(adjustHashScroll);
  window.setTimeout(adjustHashScroll, 180);
  window.setTimeout(adjustHashScroll, 520);
  window.addEventListener("load", adjustHashScroll, { once: true });
  window.addEventListener("hashchange", adjustHashScroll);
}

export function bindReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!revealElements.length) return;

  const revealVisibleElements = () => {
    document.querySelectorAll(".reveal").forEach((element) => {
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

  if (!revealListenersBound) {
    window.addEventListener("load", revealVisibleElements, { once: true });
    window.addEventListener("pageshow", revealVisibleElements);
    window.addEventListener("resize", revealVisibleElements, { passive: true });
    revealListenersBound = true;
  }

  requestAnimationFrame(revealVisibleElements);
  window.setTimeout(revealVisibleElements, 160);
}
