// ─────────────────────────────────────────────────────────────────────────
// GO-LIVE CONFIG — fill in to switch a link on; leave "" and the element is
// removed from the page (and its empty container with it).
const CONFIG = {
  shopUrl: 'https://www.rodel.fr/eshop', // B2B store
  email: 'info@rodel.fr',                // live site shows george@ but links to info@ — confirm
  instagram: '',
};
// ─────────────────────────────────────────────────────────────────────────

import { PRODUCTS } from './label.js';

// Phones get a still-image layout: product cards, a bottom action bar, no WebGL.
// Must match the phone media query in style.css.
const phone = matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)').matches;

renderCards();
const collection = initCollection();
applyConfig();

if (!phone) {
  import('./scene.js')
    .then((m) => m.startScene(collection))
    .catch(() => document.documentElement.classList.add('no-webgl'));
}

function applyConfig() {
  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.dataset.config;
    const val = CONFIG[key];
    if (!val) { el.remove(); return; }
    if (key === 'email') { el.href = `mailto:${val}`; if (el.dataset.fill !== undefined) el.textContent = val; }
    else el.href = val;
  });
  document.querySelectorAll('[data-config-group]').forEach((g) => {
    if (!g.querySelector('a')) g.remove();
  });
}

// ── phone: one card per product, each with its own rendered tin ──
function renderCards() {
  const list = document.querySelector('.cards');
  if (!list) return;
  list.innerHTML = PRODUCTS.map((p) => `
    <li class="card">
      <picture>
        <source media="(min-width: 901px) and (min-aspect-ratio: 9/10)" srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
        <img src="img/tin-${p.id}.webp" width="900" height="640" alt="${p.name} tin" loading="lazy" decoding="async">
      </picture>
      <p class="mono">N° ${p.no} · ${p.sub}</p>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <dl class="specs">${p.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <a class="card-link" data-config="shopUrl" href="#" rel="noopener">Order through the B2B store <span aria-hidden="true">→</span></a>
    </li>`).join('');
}

// ── desktop: collection tabs drive the tin ──
function initCollection() {
  const api = { onChange: null, current: () => PRODUCTS[idx] };
  let idx = 0;
  const tabs = document.querySelector('.tabs');
  const name = document.querySelector('[data-p="name"]');
  const sub = document.querySelector('[data-p="sub"]');
  const desc = document.querySelector('[data-p="desc"]');
  const specs = document.querySelector('[data-p="specs"]');
  if (!tabs) return api;

  PRODUCTS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="mono">${p.no}</span>${p.name}`;
    b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => select(i));
    tabs.append(b);
  });

  function select(i) {
    if (i === idx) return;
    idx = i;
    const p = PRODUCTS[i];
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    const panel = name.closest('.product');
    panel.classList.remove('swap');
    void panel.offsetWidth;
    panel.classList.add('swap');
    render(p);
    api.onChange?.(p);
  }

  function render(p) {
    name.textContent = p.name;
    sub.textContent = p.sub;
    desc.textContent = p.desc;
    specs.innerHTML = p.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  render(PRODUCTS[0]);
  return api;
}
