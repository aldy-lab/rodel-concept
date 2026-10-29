// The Maison history told on scroll: chapters reveal as they arrive, each
// carries its date in large outline behind the photograph, and a rail on the
// right tracks the chapter being read. The motion itself is CSS (style.css,
// "story"); this only marks state. Without JS everything is simply visible.

export function initStory(root) {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  html.classList.add('story-ready');

  const chapters = [...root.querySelectorAll('.chapter')];
  const lang = html.lang.startsWith('fr') ? 'fr' : 'en';

  // ── the date of each chapter, in large outline, from its "I · 1804" line ──
  chapters.forEach((ch, k) => {
    ch.id = ch.id || `chapitre-${k + 1}`;
    const no = ch.querySelector('.chapter-no')?.textContent || '';
    const year = (no.match(/\d{4}(?:\s*[–-]\s*\d{4})?/) || [''])[0].replace(/\s/g, '');
    ch.dataset.roman = no.split('·')[0].trim();
    ch.dataset.year = year;
    if (year) {
      const big = document.createElement('span');
      big.className = 'chapter-year';
      big.setAttribute('aria-hidden', 'true');
      big.textContent = year.split('–')[0];
      ch.prepend(big);
    }
  });

  // ── reveal on arrival ──
  const targets = [...chapters, ...document.querySelectorAll('.story-hero, .coda, .people, .archive-section .section-head')];
  if (reduced) {
    targets.forEach((t) => t.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -18% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  // ── "Bon appétit." letter by letter ──
  const coda = document.querySelector('.coda-line em');
  if (coda) {
    const text = coda.textContent;
    coda.setAttribute('aria-label', text);
    coda.innerHTML = [...text].map((c, k) => `<span aria-hidden="true" style="--i:${k}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  }

  // ── chapter rail ──
  const rail = document.createElement('nav');
  rail.className = 'story-rail';
  rail.setAttribute('aria-label', lang === 'fr' ? 'Chapitres' : 'Chapters');
  // roman numerals only: the rail lives in the page gutter, so it stays narrow;
  // the current chapter's date runs vertically underneath
  rail.innerHTML = `<i class="rail-fill" aria-hidden="true"></i><ol>${chapters.map((ch) => `
    <li><a href="#${ch.id}" aria-label="${ch.dataset.roman} ${ch.querySelector('h2')?.textContent.trim() || ''}"><span class="mono">${ch.dataset.roman}</span></a></li>`).join('')}</ol>
    <p class="rail-now mono" aria-hidden="true"></p>`;
  document.body.append(rail);
  const links = [...rail.querySelectorAll('a')];
  const fill = rail.querySelector('.rail-fill');
  const now = rail.querySelector('.rail-now');

  // which chapter is being read: the one crossing the middle of the screen
  const watch = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const k = chapters.indexOf(e.target);
    links.forEach((a, j) => a.classList.toggle('on', j === k));
    fill.style.transform = `scaleY(${((k + 1) / chapters.length).toFixed(3)})`;
    now.textContent = chapters[k].dataset.year || '';
  }), { rootMargin: '-48% 0px -48% 0px' });
  chapters.forEach((ch) => watch.observe(ch));

  // the rail shows only while the chapters are on screen
  const span = new IntersectionObserver(([e]) => rail.classList.toggle('shown', e.isIntersecting), { rootMargin: '-30% 0px -30% 0px' });
  span.observe(root);
}
