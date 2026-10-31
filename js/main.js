// ─────────────────────────────────────────────────────────────────────────
// GO-LIVE CONFIG — fill in to switch a link on; leave "" and the element is
// removed from the page (and its empty container with it).
const CONFIG = {
  // Where order requests are POSTed as JSON (e.g. a Formspree or Basin form).
  // Blank: the cart opens an email to tradeEmail with the order written out.
  orderEndpoint: '',
  email: 'info@rodel.fr',        // general enquiries and personal data (legal notice)
  tradeEmail: 'george@rodel.fr', // orders and partnerships (contact page)
  instagram: '',
};
// ─────────────────────────────────────────────────────────────────────────

import { TINS, tx } from './products.js';
import { T } from './i18n.js';
import { initStore } from './store.js';

// Phones get a still-image layout: product cards, a bottom action bar, no WebGL.
// Must match the phone media query in style.css.
const phone = matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)').matches;
const base = document.documentElement.dataset.base || '';

const collection = initCollection();
applyConfig();
initStore(CONFIG);

if (document.body.classList.contains('home')) import('./wow.js').then((m) => m.initWow());
const reelRoot = document.querySelector('[data-reel]');
if (reelRoot) import('./reel.js').then((m) => m.initReel(reelRoot));
const storyRoot = document.querySelector('[data-story]');
if (storyRoot) import('./story.js').then((m) => m.initStory(storyRoot));
if (document.querySelector('.plate-video, .journey')) initClips();
const galleryRoot = document.querySelector('[data-gallery]');
if (galleryRoot) import('./gallery.js').then((m) => m.initGallery(galleryRoot));

if (!phone && document.getElementById('scene')) {
  import('./scene.js')
    .then((m) => m.startScene(collection))
    .catch(() => document.documentElement.classList.add('no-webgl'));
}

function applyConfig() {
  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.dataset.config;
    const val = CONFIG[key];
    if (!val) { el.remove(); return; }
    if (/mail$/i.test(key)) {
      el.href = `mailto:${val}`;
      if (el.dataset.fill !== undefined) el.textContent = val;
    } else el.href = val;
  });
  document.querySelectorAll('[data-config-group]').forEach((g) => {
    if (!g.querySelector('a')) g.remove();
  });
}

// ── desktop, home page: collection tabs drive the tin ──
function initCollection() {
  const api = { onChange: null, current: () => TINS[idx] };
  let idx = 0;
  const tabs = document.querySelector('.tabs');
  const name = document.querySelector('[data-p="name"]');
  const sub = document.querySelector('[data-p="sub"]');
  const desc = document.querySelector('[data-p="desc"]');
  const specs = document.querySelector('[data-p="specs"]');
  if (!tabs) return api;

  const base = document.documentElement.dataset.base || '';
  TINS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    // each tab shows the real lid, so the range is visible at a glance
    b.innerHTML = `<img src="${base}img/lids/${p.id}-160.webp" width="160" height="125" alt="" loading="lazy"><span>${tx(p, 'name')}</span>`;
    b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => select(i));
    tabs.append(b);
  });

  function select(i) {
    if (i === idx) return;
    idx = i;
    const p = TINS[i];
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    const panel = name.closest('.product');
    panel.classList.remove('swap');
    void panel.offsetWidth;
    panel.classList.add('swap');
    render(p);
    api.onChange?.(p);
  }

  function render(p) {
    name.textContent = tx(p, 'name');
    sub.textContent = p.tin;
    desc.textContent = tx(p, 'desc');
    specs.innerHTML = [[T.specs[0], tx(p, 'line')], [T.specs[1], p.weight], [T.specs[2], p.ref]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  render(TINS[0]);
  return api;
}

// Desktop scrolling glides with a little inertia, the way the scene moves.
// Touch keeps the native scroll; reduced motion and lightbox keep it still.
if (!phone && !matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer: fine)').matches) {
  import('https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.mjs').then(({ default: Lenis }) => {
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 72;
    const lenis = new Lenis({
      autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9,
      anchors: { offset: -header },
      prevent: (node) => !!node.closest?.('dialog, [data-lenis-prevent]'),
    });
    let held = false;
    new MutationObserver(() => {
      const open = document.documentElement.classList.contains('lb-open');
      if (open !== held) { held = open; if (open) lenis.stop(); else lenis.start(); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }).catch(() => { /* the native scroll stays */ });
}

// Archive photographs animated with Higgsfield: each clip loads only when its
// figure comes on screen, plays once over the still and holds its last frame.
// Reduced motion and data savers keep the stills. Journey chapters reveal too.
function initClips() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  document.documentElement.classList.add('clips-ready');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const el = e.target;
    if (el.matches('.journey > li')) { if (e.isIntersecting) { el.classList.add('is-in'); io.unobserve(el); } return; }
    const v = el.querySelector('.plate-video');
    if (!e.isIntersecting) { v.pause(); return; }
    if (v.ended) return;
    if (!v.src) { v.preload = 'auto'; v.src = v.dataset.src; }
    v.play().then(() => el.classList.add('playing')).catch(() => {});
  }), { threshold: 0.4 });
  if (!still) document.querySelectorAll('.plate').forEach((f) => { if (f.querySelector('.plate-video')) io.observe(f); });
  document.querySelectorAll('.journey > li').forEach((li) => (still ? li.classList.add('is-in') : io.observe(li)));
}
