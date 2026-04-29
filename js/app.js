import { applyStaticTranslations, bindLocaleSwitcher, redirectRootToPreferredLocale } from "./i18n.js";
import { bindBackToTop, bindContactPanel, bindHashScrollFix, bindImageProtection, bindLightbox, bindMenu, bindViewportDebug } from "./ui.js";

redirectRootToPreferredLocale();

applyStaticTranslations();
bindLightbox();
bindMenu();
bindImageProtection();
bindContactPanel();
bindLocaleSwitcher();
bindBackToTop();
bindHashScrollFix();
bindViewportDebug();

requestAnimationFrame(async () => {
  const { loadGallery } = await import("./data.js");
  loadGallery();
});
