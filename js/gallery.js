// The Maison archive: filter by theme, open any photograph full screen, step
// through with arrows, keys or a swipe. <dialog> gives Esc, the focus trap and
// focus return for free.

export function initGallery(root) {
  root.dataset.ready = ''; // the entrance styles only apply once this runs
  const items = [...root.querySelectorAll('.g-item')];
  const dlg = root.querySelector('dialog');
  const img = dlg.querySelector('img');
  const cap = dlg.querySelector('.lb-cap');
  const count = dlg.querySelector('.lb-count');
  let visible = items;
  let i = 0;

  // ── filters ──
  const bar = root.querySelector('.g-filters');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-g]');
    if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    items.forEach((it) => it.classList.toggle('is-filtered', b.dataset.g !== 'all' && it.dataset.tag !== b.dataset.g));
    visible = items.filter((it) => !it.classList.contains('is-filtered'));
    // re-run the entrance so the new set settles in rather than jumping
    visible.forEach((it, k) => {
      it.style.setProperty('--k', k % 12);
      it.classList.remove('enter');
      void it.offsetWidth;
      it.classList.add('enter');
    });
  });

  // ── viewer ──
  const full = (it) => {
    const thumb = it.querySelector('img');
    return (thumb.currentSrc || thumb.src).replace(/-800\.webp$/, '.webp');
  };
  const pad = (n) => String(n).padStart(2, '0');

  function show(dir = 0) {
    const it = visible[i];
    img.classList.remove('in');
    img.style.setProperty('--from', `${dir * 24}px`);
    img.src = full(it);
    img.alt = it.querySelector('img').alt;
    cap.textContent = it.querySelector('.g-cap').textContent;
    count.textContent = `${pad(i + 1)} / ${pad(visible.length)}`;
    const done = () => img.classList.add('in');
    if (img.complete) requestAnimationFrame(done); else img.addEventListener('load', done, { once: true });
    // warm the neighbours so stepping never waits
    [i + 1, i - 1].forEach((k) => { const n = visible[(k + visible.length) % visible.length]; if (n) new Image().src = full(n); });
  }
  const step = (d) => { i = (i + d + visible.length) % visible.length; show(d); };

  items.forEach((it) => it.querySelector('.g-open').addEventListener('click', () => {
    i = Math.max(0, visible.indexOf(it));
    dlg.showModal();
    document.documentElement.classList.add('lb-open');
    show();
  }));
  dlg.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  dlg.querySelector('.lb-next').addEventListener('click', () => step(1));
  dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => document.documentElement.classList.remove('lb-open'));
  // a click on the backdrop (the dialog itself, not its content) closes
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  // swipe on touch screens
  let x0 = null;
  dlg.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  dlg.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  });

  // first appearance: items rise in as the grid scrolls into view
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('enter'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach((it, k) => { it.style.setProperty('--k', k % 4); io.observe(it); });
}
