import { state } from "./store.js";
import { applyStaticTranslations, bindLocaleSwitcher, redirectRootToPreferredLocale } from "./i18n.js";
import { bindBackToTop, bindContactPanel, bindHashScrollFix, bindImageProtection, bindLightbox, bindMenu } from "./ui.js";
import { refreshView } from "./render.js";
import { loadGallery } from "./data.js";

redirectRootToPreferredLocale();

function applyLocale() {
  applyStaticTranslations();

  if (state.galleries.length) {
    refreshView();
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
