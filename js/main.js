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

import { TINS } from './products.js';
import { initStore } from './store.js';

// Phones get a still-image layout: product cards, a bottom action bar, no WebGL.
// Must match the phone media query in style.css.
const phone = matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)').matches;
const base = document.documentElement.dataset.base || '';

renderCards();
const collection = initCollection();
applyConfig();
initStore(CONFIG);

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

// ── phone, home page: one card per tin, with the real pack shot ──
function renderCards() {
  const list = document.querySelector('.cards');
  if (!list) return;
  list.innerHTML = TINS.map((p) => `
    <li class="card">
      <picture>
        <source media="(min-width: 901px) and (min-aspect-ratio: 9/10)" srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
        <img src="${base}img/products/${p.id}-600.webp" width="600" height="450" alt="Rödel ${p.name} tin" loading="lazy" decoding="async">
      </picture>
      <p class="mono">${p.line} · ${p.weight}</p>
      <h3>${p.name}</h3>
      <p>${p.lead}</p>
      <a class="card-link" href="${base}collection/#${p.id}">Read more <span aria-hidden="true">→</span></a>
    </li>`).join('');
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

  TINS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.name;
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
    name.textContent = p.name;
    sub.textContent = p.tin;
    desc.textContent = p.desc;
    specs.innerHTML = [['Line', p.line], ['Net weight', p.weight], ['Ref.', p.ref]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  render(TINS[0]);
  return api;
}
