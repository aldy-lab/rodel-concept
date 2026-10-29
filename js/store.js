// The B2B store: a cart kept on this device, the order form, and the order
// request. There is no payment on this site — an order is sent as a request
// and confirmed by the house, as the B2B terms describe.

import { PRODUCTS, byId, MIN_ORDER, money, tx } from './products.js';
import { T } from './i18n.js';

const KEY = 'rodel-cart-v1';

// ── cart ── { productId: cases }. Storage can be missing or throw (private
// windows, blocked site data); unknown ids are dropped so a renamed product
// can never wedge a cart.
let storageOk = true;
let memory = {}; // used when storage is unavailable
function clean(raw) {
  const out = {};
  for (const [id, n] of Object.entries(raw || {})) {
    if (byId[id] && Number.isInteger(n) && n > 0) out[id] = Math.min(n, 999);
  }
  return out;
}
function get() {
  if (!storageOk) return { ...memory };
  try {
    return clean(JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch {
    storageOk = false;
    return { ...memory };
  }
}
function write(c) {
  memory = c;
  if (storageOk) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { storageOk = false; }
  }
  document.dispatchEvent(new CustomEvent('cart'));
}
export const cart = {
  get,
  set(id, cases) {
    const c = get();
    if (cases > 0) c[id] = Math.min(Math.round(cases), 999); else delete c[id];
    write(c);
  },
  add(id, cases) { this.set(id, (get()[id] || 0) + cases); },
  clear() { write({}); },
};

export function lines(c = get()) {
  return PRODUCTS.filter((p) => c[p.id]).map((p) => {
    const cases = c[p.id];
    const units = cases * p.units;
    return { p, cases, units, total: units * p.price };
  });
}
export function totals(c = get()) {
  return lines(c).reduce((t, l) => ({ cases: t.cases + l.cases, units: t.units + l.units, total: t.total + l.total }), { cases: 0, units: 0, total: 0 });
}

// ── header counter ──
function counters() {
  const n = totals().cases;
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = n;
    el.closest('[data-cart-link]')?.classList.toggle('has-items', n > 0);
  });
}

// ── steppers: − [n] + ──
function stepper(root, onChange, live = true) {
  const input = root.querySelector('input');
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const v = Math.max(Number(input.min || 0), Math.min(999, (parseInt(input.value, 10) || 0) + Number(b.dataset.step)));
    input.value = v;
    onChange?.(v);
  }));
  input.addEventListener(live ? 'input' : 'change', () => onChange?.(Math.max(0, Math.min(999, parseInt(input.value, 10) || 0))));
}

// ── "add to cart" on store cards and product pages ──
function buyForms() {
  document.querySelectorAll('form.buy').forEach((form) => {
    stepper(form.querySelector('.stepper'));
    const note = form.querySelector('.added');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = Math.max(1, parseInt(form.elements.cases.value, 10) || 1);
      cart.add(form.dataset.id, n);
      if (note) {
        note.hidden = false;
        note.textContent = T.added(n);
        clearTimeout(form._t);
        form._t = setTimeout(() => { note.hidden = true; }, 2400);
      }
    });
  });
}

// ── store filter: All / Sardines / Specialities ──
function filters() {
  const bar = document.querySelector('.filters');
  if (!bar) return;
  const cards = [...document.querySelectorAll('.store-grid [data-cat]')];
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]');
    if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    // a class with display:none — the hidden attribute loses to the card's own display
    cards.forEach((c) => c.classList.toggle('is-filtered', b.dataset.filter !== 'all' && c.dataset.cat !== b.dataset.filter));
    const none = document.querySelector('.no-results');
    if (none) none.hidden = cards.some((c) => !c.classList.contains('is-filtered'));
  });
}

// ── the B2B order form: cases per line, live totals, into the cart ──
function orderForm() {
  const table = document.querySelector('.order-table');
  if (!table) return;
  const rows = [...table.querySelectorAll('tbody tr[data-id]')];
  const c = get();
  rows.forEach((r) => { r.querySelector('input').value = c[r.dataset.id] || 0; });
  const sum = () => {
    let cases = 0, units = 0, total = 0;
    rows.forEach((r) => {
      const p = byId[r.dataset.id];
      const n = Math.max(0, parseInt(r.querySelector('input').value, 10) || 0);
      r.querySelector('[data-units]').textContent = n * p.units;
      r.querySelector('[data-total]').textContent = money(n * p.units * p.price);
      cases += n; units += n * p.units; total += n * p.units * p.price;
    });
    document.querySelector('[data-of="cases"]').textContent = cases;
    document.querySelector('[data-of="units"]').textContent = units;
    document.querySelector('[data-of="total"]').textContent = money(total);
    const short = MIN_ORDER - total;
    const msg = document.querySelector('[data-of="minimum"]');
    msg.textContent = short > 0 ? T.toMinimum(money(short), money(MIN_ORDER)) : T.minimumReached;
    msg.classList.toggle('ok', short <= 0);
    progress(total);
    return cases;
  };
  rows.forEach((r) => stepper(r.querySelector('.stepper'), sum));
  sum();
  document.querySelector('[data-of="add"]').addEventListener('click', () => {
    rows.forEach((r) => cart.set(r.dataset.id, Math.max(0, parseInt(r.querySelector('input').value, 10) || 0)));
    location.href = document.querySelector('[data-of="add"]').dataset.href;
  });
}

// ── the cart page and the order request ──
function cartPage(config) {
  const box = document.querySelector('[data-cart-lines]');
  if (!box) return;
  const base = document.documentElement.dataset.base || '';
  const pages = document.documentElement.dataset.pages ?? base; // page links stay in the page's language
  const summary = document.querySelector('[data-cart-summary]');
  const form = document.getElementById('order-request');
  const empty = document.querySelector('[data-cart-empty]');
  const full = document.querySelector('[data-cart-full]');
  const done = document.querySelector('[data-cart-done]');

  let shown = '';
  function render() {
    const ls = lines();
    const t = totals();
    empty.hidden = ls.length > 0;
    full.hidden = ls.length === 0;
    const sig = ls.map((l) => l.p.id).join();
    if (sig === shown) {
      // same products: update figures in place, so typing in a box keeps focus
      ls.forEach(({ p, cases, units, total }) => {
        const li = box.querySelector(`[data-id="${p.id}"]`);
        const input = li.querySelector('input');
        if (document.activeElement !== input) input.value = cases;
        li.querySelector('.cart-line-total').innerHTML = `<span class="mono">${units} ${T.tins}</span>${money(total)}`;
      });
    } else {
      shown = sig;
      box.innerHTML = ls.map(({ p, cases, units, total }) => `
      <li class="cart-line" data-id="${p.id}">
        <a href="${pages}store/${p.id}/"><img src="${base}img/products/${p.id}-600.webp" width="600" height="450" alt="" loading="lazy"></a>
        <div class="cart-line-copy">
          <a class="cart-line-name" href="${pages}store/${p.id}/">${tx(p, 'name')}</a>
          <p class="mono">${p.weight} · ${money(p.price)} ${T.perTin} · ${p.units} ${T.perCase}</p>
        </div>
        <div class="stepper" role="group" aria-label="${T.casesOf(tx(p, 'name'))}">
          <button type="button" data-step="-1" aria-label="${T.fewer}">−</button>
          <input type="number" inputmode="numeric" min="0" max="999" value="${cases}" aria-label="${T.cases}">
          <button type="button" data-step="1" aria-label="${T.more}">+</button>
        </div>
        <p class="cart-line-total"><span class="mono">${units} ${T.tins}</span>${money(total)}</p>
        <button type="button" class="remove" aria-label="${T.removeName(tx(p, 'name'))}">${T.remove}</button>
      </li>`).join('');
      box.querySelectorAll('.cart-line').forEach((li) => {
        const id = li.dataset.id;
        // typed values commit on change: clearing the box to retype must not delete the line
        stepper(li.querySelector('.stepper'), (v) => cart.set(id, v), false);
        li.querySelector('.remove').addEventListener('click', () => cart.set(id, 0));
      });
    }
    const short = MIN_ORDER - t.total;
    summary.innerHTML = `
      <div><dt>${T.cases}</dt><dd>${t.cases}</dd></div>
      <div><dt>${T.tins}</dt><dd>${t.units}</dd></div>
      <div class="grand"><dt>${T.total}</dt><dd>${money(t.total)}</dd></div>`;
    const min = document.querySelector('[data-cart-minimum]');
    min.textContent = short > 0 ? T.toMinimum(money(short), money(MIN_ORDER)) : T.minimumReached;
    min.classList.toggle('ok', short <= 0);
    progress(t.total);
    form.querySelector('[type=submit]').disabled = short > 0;
  }

  function request(data) {
    const ls = lines();
    const t = totals();
    const order = ls.map(({ p, cases, units, total }) => `${p.ref}  ${tx(p, 'b2b')}  ×${cases} (${units} ${T.tins})  ${money(total)}`).join('\n');
    const who = ['company', 'vat', 'name', 'email', 'phone', 'address', 'message']
      .map((k) => [form.elements[k].dataset.label, data.get(k)]).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
    return { order, t, who, text: `${T.requestTitle}\n\n${order}\n\n${T.total}: ${T.casesTins(t.cases, t.units)}, ${money(t.total)}\n${T.shipping}\n\n${who}` };
  }

  // The request goes to a form endpoint when one is configured; otherwise to the
  // trade inbox by email. Either way nothing here pretends to take a payment.
  const viaEmail = !config.orderEndpoint;
  form.querySelector('[type=submit]').textContent = viaEmail ? T.emailIt : T.sendIt;
  form.querySelector('[data-route]').textContent = viaEmail ? T.routeEmail(config.tradeEmail) : T.routePost;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (totals().total < MIN_ORDER) return;
    const data = new FormData(form);
    const r = request(data);
    const status = form.querySelector('[data-status]');
    if (viaEmail) {
      location.href = `mailto:${config.tradeEmail}?subject=${encodeURIComponent(T.subject(data.get('company')))}&body=${encodeURIComponent(r.text)}`;
      status.textContent = T.ifNothing;
      form.querySelector('[data-fallback]').hidden = false;
      form.querySelector('[data-fallback] textarea').value = r.text;
      return;
    }
    status.textContent = T.sending;
    try {
      const res = await fetch(config.orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(data), order: r.order, cases: r.t.cases, tins: r.t.units, total: money(r.t.total) }),
      });
      if (!res.ok) throw new Error(res.status);
      cart.clear();
      full.hidden = true;
      done.hidden = false;
      done.querySelector('[data-done-company]').textContent = data.get('company');
    } catch {
      status.textContent = T.failed(config.tradeEmail);
    }
  });

  document.addEventListener('cart', render);
  render();
}

// ── progress toward the €1,000 minimum (order form and cart) ──
function progress(total) {
  document.querySelectorAll('[data-progress]').forEach((el) => {
    const share = Math.min(1, total / MIN_ORDER);
    el.querySelector('i').style.transform = `scaleX(${share.toFixed(4)})`;
    el.classList.toggle('ok', share >= 1);
    el.querySelector('span').textContent = T.progress(money(Math.min(total, MIN_ORDER)), money(MIN_ORDER));
  });
}

// ── one click: three cases of every sardine, which clears the minimum ──
function assortment() {
  document.querySelectorAll('[data-assortment]').forEach((b) => b.addEventListener('click', () => {
    PRODUCTS.filter((p) => p.cat === 'Sardines').forEach((p) => cart.add(p.id, 3));
    location.href = b.dataset.href;
  }));
}

export function initStore(config) {
  counters();
  document.addEventListener('cart', counters);
  addEventListener('storage', (e) => { if (e.key === KEY) document.dispatchEvent(new CustomEvent('cart')); });
  buyForms();
  filters();
  orderForm();
  cartPage(config);
  assortment();
}
