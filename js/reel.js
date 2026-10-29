// The home history reel: the section pins while seven eras pass. Each era
// brings its photograph onto the pile, counts the year to its date and tints
// the ground. Steps are marked by an IntersectionObserver on invisible
// spacers, so nothing is computed per frame except the short year count.

export function initReel(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.ready = '';
  const prints = [...root.querySelectorAll('.print')];
  const texts = [...root.querySelectorAll('.reel-text li')];
  const ambient = [...root.querySelectorAll('.reel-ambient img')];
  const steps = [...root.querySelectorAll('.reel-steps > div')];
  const num = root.querySelector('.reel-num');
  const prefix = root.querySelector('.reel-prefix');
  const count = root.querySelector('.reel-count');
  const bar = root.querySelector('.reel-bar i');
  const n = texts.length;
  const pad = (v) => String(v).padStart(2, '0');
  let active = -1;
  let shown = Number(texts[0].dataset.year);
  let raf = 0;

  // photographs further down the pile load as the reader approaches
  prints.forEach((p) => p.querySelector('img').loading = 'eager');
  // Higgsfield clips: only the era on show loads and plays, once, and holds
  // its last frame; data savers and reduced motion keep the stills
  const saveData = navigator.connection?.saveData;
  const motion = !reduced && !saveData;
  function play(p, on) {
    const v = p.querySelector('video');
    if (!v) return;
    if (!on || !motion) { v.pause(); p.classList.remove('playing'); return; }
    if (!v.src) v.src = v.dataset.src;
    v.currentTime = 0;
    v.play().then(() => p.classList.add('playing')).catch(() => {});
  }

  function countTo(target) {
    cancelAnimationFrame(raf);
    if (reduced) { shown = target; num.textContent = target; return; }
    const from = shown, t0 = performance.now(), dur = 950;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      shown = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      num.textContent = shown;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function go(k) {
    if (k === active) return;
    active = k;
    prints.forEach((p, i) => {
      const d = i - k;
      p.classList.toggle('is-active', d === 0);
      p.classList.toggle('is-past', d < 0);
      p.classList.toggle('is-next', d > 0);
      p.style.setProperty('--d', Math.max(-4, Math.min(0, d)));
      p.style.zIndex = String(10 + i);
      play(p, d === 0);
    });
    texts.forEach((t, i) => t.classList.toggle('is-active', i === k));
    ambient.forEach((a, i) => a.classList.toggle('is-active', i === k));
    prefix.textContent = texts[k].dataset.prefix ? `${texts[k].dataset.prefix} ` : '';
    countTo(Number(texts[k].dataset.year));
    count.textContent = `${pad(k + 1)} / ${pad(n)}`;
    bar.style.transform = `scaleX(${((k + 1) / n).toFixed(3)})`;
    root.classList.toggle('started', k > 0);
  }

  // the step crossing the middle of the screen is the era on show
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) go(steps.indexOf(e.target));
  }), { rootMargin: '-50% 0px -50% 0px' });
  steps.forEach((s) => io.observe(s));
  go(0);
}
