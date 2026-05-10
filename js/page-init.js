const supportedLangs = ['en', 'de', 'nl', 'no', 'fr', 'es', 'it', 'pt', 'cs'];
function initPageContext() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(p => p);
  let lang = 'en', slug = '';
  if (parts.length > 0 && supportedLangs.includes(parts[0])) {
    lang = parts[0];
    slug = parts[1] || 'index';
  } else {
    slug = parts[0] || 'index';
  }
  window.__PAGE_LANG__ = lang;
  window.__PAGE_SLUG__ = slug;
}
function initScrollListener() {
  window.addEventListener('scroll', () => {
    const html = document.documentElement;
    html.classList.toggle('at-top', window.scrollY === 0);
  }, { passive: true });
}
document.addEventListener('DOMContentLoaded', () => {
  initPageContext();
  initScrollListener();
});