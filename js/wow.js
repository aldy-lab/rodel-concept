// Home page flourishes: the opening, the hero headline arriving word by word,
// the numbers counting up, and the tins tilting under the cursor (their shadow
// swings the other way, so the tin seems to lift off the page).

export function initWow() {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── the opening: once per visit, skippable ──
  const intro = document.querySelector('.intro');
  try { sessionStorage.setItem('rodel-intro', '1'); } catch { /* storage blocked */ }
  const done = () => { html.classList.add('intro-done'); setTimeout(() => intro?.remove(), 1200); };
  // the inline script in <head> decided before first paint whether to play it
  if (!intro || !html.classList.contains('intro-on')) { intro?.remove(); html.classList.add('intro-done', 'intro-skipped'); }
  else {
    const t = setTimeout(done, 2300);
    intro.addEventListener('click', () => { clearTimeout(t); done(); });
  }

  // ── hero headline, word by word ──
  const h1 = document.querySelector('.hero h1');
  if (h1 && !reduced) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    walk(h1);
    h1.classList.add('words');
  }

  // ── numbers count up when they arrive ──
  const nums = document.querySelectorAll('.num-n');
  const fmt = (v, sep) => (sep ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(v));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = Number(el.dataset.to), sep = el.dataset.sep;
    if (reduced) return;
    const from = to === 1824 ? 1700 : 0, t0 = performance.now(), dur = 1800;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 4)), sep);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
  const band = document.querySelector('.numbers-band');
  if (band) new IntersectionObserver(([e]) => { if (e.isIntersecting) band.classList.add('in'); }, { threshold: 0.3 }).observe(band);

  // ── tins tilt toward the cursor ──
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.range-item a, .store-card-media').forEach((card) => {
      card.classList.add('tilt');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(x * 18).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
    });
  }
}
