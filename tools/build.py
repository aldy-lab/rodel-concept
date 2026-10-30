"""Generate every page of the site, in English (/) and French (/fr/).

All pages share templates/chrome.html (head, header, footer, dock), with
labels from tools/i18n.py, so chrome cannot drift between pages or languages.
Page bodies come from pages/<lang>/*.html; Collection, Trade, the store,
product pages, the order form and the cart are generated from js/products.js.
Old rodel.fr addresses get redirect pages; sitemap.xml lists both languages.

    python3 tools/build.py
"""
import html, json, pathlib, re, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from i18n import CHROME, S, STOCKISTS, ARCHIVE_FR, GALLERY, GALLERY_TAGS, GALLERY_UI, REEL, REEL_UI  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = 'https://aldy-lab.github.io/rodel-concept/'
LANGS = ('en', 'fr')
PREFIX = {'en': '', 'fr': 'fr/'}
ASSETS = json.loads((ROOT / 'tools' / 'assets.json').read_text())
_data = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e',
     f"import('{(ROOT / 'js' / 'products.js').as_uri()}').then(m => console.log(JSON.stringify({{p: m.PRODUCTS, fr: m.PRODUCTS_FR}})))"]))
PRODUCTS, PFR = _data['p'], _data['fr']
CHROME_SRC = (ROOT / 'templates' / 'chrome.html').read_text()
esc = html.escape


def ptx(p, key, lang):
    """A product's text in the page's language (falls back to English)."""
    return (PFR.get(p['id'], {}).get(key) if lang == 'fr' else None) or p.get(key)


def money(v, lang):
    """Must print exactly what js/products.js money() prints (Intl en-GB / fr-FR, EUR)."""
    if lang == 'fr':
        whole, cents = f'{v:,.2f}'.split('.')
        return whole.replace(',', ' ') + ',' + cents + ' €'
    return f'€{v:,.2f}'


def block(src, name):
    m = re.search(rf'<!-- {name} -->\n(.*?)<!-- /{name} -->\n?', src, re.S)
    return m.group(1) if m else ''


def chrome(name, lang):
    return re.sub(r'\{\{t:([a-z_]+)\}\}', lambda m: CHROME[lang][m.group(1)], block(CHROME_SRC, name))


# archive pieces that are round objects on a filled square: shown cut to their circle
ROUND = {'founders-medal'}

ASSET_PREFIXES = ('img/', 'css/', 'js/', 'og.png', 'sitemap.xml')


def rebase(text, asset_base, page_base):
    """Asset URLs resolve from the site root; page links stay in the page's language."""
    skip = ('http:', 'https:', 'mailto:', 'tel:', '#', 'data:', '/', '../')
    def one(url):
        url = url.strip()
        if not url or url.startswith(skip):
            return url
        if url.startswith(ASSET_PREFIXES):
            return asset_base + url
        if url == './':
            return page_base or './'
        return page_base + url
    def attr(m):
        name, val = m.group(1), m.group(2)
        if name == 'srcset':
            val = ', '.join(' '.join([one(part.split()[0])] + part.split()[1:]) for part in val.split(','))
        else:
            val = one(val)
        return f'{name}="{val}"'
    return re.sub(r'\b(href|src|srcset|poster)="([^"]*)"', attr, text)


# ── shared pieces ──────────────────────────────────────────────────────────

def fig(slug, cls, lang):
    a = ASSETS['archive'][slug]
    alt, cap = (ARCHIVE_FR[slug] if lang == 'fr' else (a['alt'], a['caption']))
    w, h = a['w'], a['h']
    w8, h8 = (800, round(h * 800 / w)) if w > 800 else (w, h)
    caption = f'<figcaption>{esc(cap)}</figcaption>' if cap else ''
    # the frame clips the photograph, so it can drift and scale inside without covering the caption
    cls = f'{cls} round'.strip() if slug in ROUND else cls
    return (f'<figure class="{f"plate {cls}".strip()}"><span class="frame"><img src="img/archive/{slug}-800.webp" '
            f'srcset="img/archive/{slug}-800.webp {w8}w, img/archive/{slug}.webp {w}w" '
            f'sizes="(max-width: 900px) 100vw, 46vw" width="{w8}" height="{h8}" '
            f'alt="{esc(alt)}" loading="lazy" decoding="async"></span>{caption}</figure>')


def figs(text, lang):
    return re.sub(r'\{\{fig:([a-z0-9-]+)(?:\|([a-z0-9 -]+))?\}\}', lambda m: fig(m.group(1), m.group(2) or '', lang), text)


def facts(rows):
    return '<dl class="facts">' + ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in rows) + '</dl>'


def stepper(label, lang, value=1, minimum=1):
    t = S[lang]
    return (f'<div class="stepper" role="group" aria-label="{label}">'
            f'<button type="button" data-step="-1" aria-label="{t["fewer"]}">−</button>'
            f'<input type="number" name="cases" inputmode="numeric" min="{minimum}" max="999" value="{value}" aria-label="{t["cases"]}">'
            f'<button type="button" data-step="1" aria-label="{t["more"]}">+</button></div>')


def buy(p, lang, big=False):
    t = S[lang]
    return (f'<form class="buy{" big" if big else ""}" data-id="{p["id"]}">'
            f'{stepper(t["cases_of"].format(name=esc(ptx(p, "name", lang))), lang)}'
            f'<button class="btn" type="submit">{t["add"]}</button>'
            f'<p class="added mono" role="status" hidden></p></form>')


def pack_img(p, lang, sizes='(max-width: 900px) 100vw, 30vw', eager=False):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    alt = S[lang]['photo_alt'].format(name=esc(ptx(p, 'name', lang)))
    return (f'<img src="img/products/{p["id"]}-600.webp" srcset="img/products/{p["id"]}-600.webp 600w, img/products/{p["id"]}.webp 1200w" '
            f'sizes="{sizes}" width="600" height="450" alt="{alt}" {load} decoding="async">')


def line_of(p, lang):
    return S[lang]['lines'][p['line']]


def fmt(p, lang):
    return ptx(p, 'format', lang)


def assortment_total():
    return sum(3 * p['units'] * p['price'] for p in PRODUCTS if p['cat'] == 'Sardines')


def meta_head(src):
    return json.loads(re.match(r'<!-- (\{.*?\}) -->', src).group(1))


def strip_empty(o):
    """Google rejects structured data with empty or null fields."""
    if isinstance(o, dict):
        return {k: strip_empty(v) for k, v in o.items() if v not in (None, '', [], {})}
    if isinstance(o, list):
        return [strip_empty(v) for v in o if v not in (None, '', [], {})]
    return o


def jsonld(o):
    return f'<script type="application/ld+json">{json.dumps(strip_empty(o), ensure_ascii=False)}</script>\n'


ORG = {
    '@context': 'https://schema.org', '@type': 'Organization', 'name': 'Rödel & Fils Frères', 'legalName': 'RODEL SAS',
    'foundingDate': '1824', 'url': SITE_URL, 'logo': SITE_URL + 'img/brand/logo-black.png', 'email': 'info@rodel.fr',
    'address': {'@type': 'PostalAddress', 'streetAddress': '14 rue Gambetta', 'postalCode': '78600',
                'addressLocality': 'Le Mesnil-le-Roi', 'addressCountry': 'FR'},
}


# ── home page bands ────────────────────────────────────────────────────────

def band_collection(lang):
    t = S[lang]
    items = ''.join(f'''
      <li class="range-item">
        <a href="store/{p['id']}/">
          {pack_img(p, lang, '(max-width: 900px) 50vw, 22vw')}
          <span class="mono">{line_of(p, lang)} · {p['weight']}</span>
          <span class="range-name">{esc(ptx(p, 'name', lang))}</span>
          <span class="range-lead">{esc(ptx(p, 'lead', lang))}</span>
          <span class="range-price mono">{t['from_tin'].format(price=money(p['price'], lang))}</span>
        </a>
      </li>''' for p in PRODUCTS)
    return f'''<section class="band-solid collection-band" id="all-products">
    <div class="section-head">
      <p class="kicker mono">{t['band_kicker']}</p>
      <h2>{t['band_h2']}</h2>
      <p>{t['band_lead']}</p>
    </div>
    <ul class="range">{items}
    </ul>
    <div class="actions">
      <a class="btn" href="store/">{CHROME[lang]['store']}</a>
      <button class="btn btn-ghost" type="button" data-assortment data-href="cart/">{t['band_assort'].format(total=money(assortment_total(), lang))}</button>
    </div>
  </section>'''


def band_reel(lang):
    """The home history film: pinned while nine tableaux pass. Each clip plays in a
    dark cinema frame under a silent-film intertitle; the mark (a year, or a
    place) changes top right; scenes cross-fade. js/reel.js marks the active
    tableau and plays its Higgsfield clip; without JS the first tableau shows."""
    ui = REEL_UI[lang]
    vids_file = ROOT / 'tools' / 'reel_videos.json'
    vids = {k: v for k, v in (json.loads(vids_file.read_text()) if vids_file.exists() else {}).items()
            if v.get('mp4') and (ROOT / v['mp4']).exists()}
    n = len(REEL)
    ambient, scenes, cards, ticks = [], [], [], []
    for k, (slug, roman, mark, title, text) in enumerate(REEL):
        a = ASSETS['archive'][slug]
        alt = ARCHIVE_FR[slug][0] if lang == 'fr' else a['alt']
        w, h = a['w'], a['h']
        src = f'img/archive/{slug}-800.webp'
        on = ' is-active' if k == 0 else ''
        ambient.append(f'<img class="{on.strip()}" src="{src}" alt="" data-step="{k}" loading="lazy" decoding="async">')
        video = (f'<video class="print-video" muted playsinline preload="none" poster="{src}" data-src="{vids[slug]["mp4"]}" aria-hidden="true"></video>'
                 if slug in vids else '')
        scenes.append(f'<figure class="print scene{on}{" round" if slug in ROUND else ""}" data-step="{k}" style="--ar: {w / h:.4f}"><span class="frame">'
                      f'<img src="img/archive/{slug}.webp" width="{w}" height="{h}" alt="{esc(alt)}" loading="lazy" decoding="async">{video}</span></figure>')
        num = mark[lang] if mark[lang].isdigit() else ''
        cards.append(f'<li class="{on.strip()}" data-step="{k}" data-year="{num}" data-mark="{esc(mark[lang])}" data-prefix="">'
                     f'<p class="mono reel-tableau">{ui["tableau"]} {roman}</p><h3>{esc(title[lang])}</h3><p>{esc(text[lang])}</p></li>')
        ticks.append(f'<li class="{on.strip()}" data-step="{k}"><span class="mono">{roman}</span></li>')
    return f'''<section class="band-solid reel cinema" style="--steps: {n}" data-reel>
    <div class="reel-vp">
      <div class="reel-ambient" aria-hidden="true">{''.join(ambient)}</div>
      <div class="reel-deck">{''.join(scenes)}</div>
      <div class="cinema-veil" aria-hidden="true"></div>
      <p class="kicker mono reel-kicker">{ui['kicker']}</p>
      <p class="reel-year" aria-hidden="true"><span class="reel-prefix"></span><span class="reel-num">{REEL[0][2][lang]}</span></p>
      <div class="reel-copy">
        <ol class="reel-text">{''.join(cards)}</ol>
      </div>
      <div class="reel-foot">
        <ol class="reel-ticks" aria-hidden="true">{''.join(ticks)}</ol>
        <span class="mono reel-count">01 / {n:02d}</span>
        <a class="more" href="maison/">{ui['more']} <span aria-hidden="true">→</span></a>
      </div>
      {f'<p class="reel-ai mono">{ui["ai"]}</p>' if vids else ''}
      <p class="reel-hint mono" aria-hidden="true">{ui['hint']}</p>
      <span class="reel-bar" aria-hidden="true"><i></i></span>
    </div>
    <div class="reel-steps" aria-hidden="true">{''.join('<div></div>' for _ in REEL)}</div>
  </section>'''


def gallery(lang):
    ui = GALLERY_UI[lang]
    counts = {tag: sum(1 for _, t in GALLERY if t == tag) for tag in GALLERY_TAGS}
    filters = f'<button type="button" data-g="all" aria-pressed="true">{ui["all"]} <span class="mono">{len(GALLERY)}</span></button>' + ''.join(
        f'<button type="button" data-g="{tag}" aria-pressed="false">{names[lang]} <span class="mono">{counts[tag]}</span></button>'
        for tag, names in GALLERY_TAGS.items())
    items = []
    for slug, tag in GALLERY:
        a = ASSETS['archive'][slug]
        alt, cap = (ARCHIVE_FR[slug] if lang == 'fr' else (a['alt'], a['caption']))
        label = cap or alt
        w, h = a['w'], a['h']
        w8, h8 = (800, round(h * 800 / w)) if w > 800 else (w, h)
        items.append(
            f'<li class="g-item{" round" if slug in ROUND else ""}" data-tag="{tag}"><button type="button" class="g-open" aria-label="{esc(ui["open"].format(cap=label))}">'
            f'<img src="img/archive/{slug}-800.webp" srcset="img/archive/{slug}-800.webp {w8}w, img/archive/{slug}.webp {w}w" '
            f'sizes="(max-width: 900px) 50vw, 24vw" width="{w8}" height="{h8}" alt="{esc(alt)}" loading="lazy" decoding="async">'
            f'<span class="g-cap">{esc(label)}</span><span class="g-tag mono">{GALLERY_TAGS[tag][lang]}</span></button></li>')
    return f'''<div class="gallery" data-gallery>
    <div class="g-filters" role="group" aria-label="{ui['filter']}">{filters}</div>
    <ul class="g-grid" aria-label="{ui['label']}">{''.join(items)}</ul>
    <dialog class="lightbox" aria-label="{ui['viewer']}">
      <figure><img alt=""><figcaption><span class="lb-cap"></span><span class="lb-count mono"></span></figcaption></figure>
      <button type="button" class="lb-prev" aria-label="{ui['prev']}">←</button>
      <button type="button" class="lb-next" aria-label="{ui['next']}">→</button>
      <button type="button" class="lb-close" aria-label="{ui['close']}">×</button>
    </dialog>
  </div>'''


def band_stockists(lang):
    return '<ul class="stockists compact">' + ''.join(
        f'<li><span>{esc(n)}</span><span class="mono">{c[lang] if c else ""}</span></li>' for n, c in STOCKISTS) + '</ul>'


BANDS = {'collection': band_collection, 'reel': band_reel, 'stockists': band_stockists}


# ── generated pages ────────────────────────────────────────────────────────

def collection_page(lang):
    t = S[lang]
    out = []
    for line in ['Millésime', 'Recipes of the house', 'Specialities']:
        items = []
        for p in [p for p in PRODUCTS if p['line'] == line]:
            note = f"<p>{esc(ptx(p, 'note', lang))}</p>" if ptx(p, 'note', lang) else ''
            items.append(f'''
    <article class="product-row" id="{p['id']}">
      <figure class="pack">{pack_img(p, lang, '(max-width: 900px) 100vw, 44vw')}</figure>
      <div class="product-copy">
        <p class="mono">{line_of(p, lang)} · {p['weight']}</p>
        <h3>{esc(ptx(p, 'name', lang))}</h3>
        <p class="tin-text mono">{esc(p['tin'])}</p>
        <p class="lead">{esc(ptx(p, 'lead', lang))}</p>
        <p>{esc(ptx(p, 'desc', lang))}</p>
        {note}
        {facts([(t['net_weight'], p['weight']), (t['format'], fmt(p, lang)), (t['case'], f"{p['units']} {t['tins']}"), (t['ref'], p['ref']), (t['ean'], p['ean'])])}
        <a class="more" href="store/{p['id']}/">{CHROME[lang]['store']} <span aria-hidden="true">→</span></a>
      </div>
    </article>''')
        out.append(f'''
  <section class="line">
    <h2 class="line-title"><span class="mono">{len(items):02d}</span>{t['lines'][line]}</h2>{''.join(items)}
  </section>''')
    head = json.dumps({'title': t['col_title'], 'description': t['col_desc'], 'nav': 'collection/'}, ensure_ascii=False)
    return f'''<!-- {head} -->
<section class="page-hero">
  <p class="kicker mono">{t['col_kicker']}</p>
  <h1>{t['col_h1']}</h1>
  <p class="lead">{t['col_lead']}</p>
</section>
{''.join(out)}
<section class="closing">
  <p class="mono">{t['pros']}</p>
  <h2>{t['order_through']}</h2>
  <div class="actions">
    <a class="btn" href="store/">{CHROME[lang]['store']}</a>
    <a class="btn btn-ghost" href="trade/">{t['terms_cat']}</a>
  </div>
</section>
'''


def trade_page(lang):
    t = S[lang]
    rows = ''.join(f'''
      <tr><td class="mono">{p['ref']}</td><td>{esc(ptx(p, 'b2b', lang))}</td><td>{p['weight']}</td><td>{p['units']}</td><td class="mono">{p['ean']}</td></tr>''' for p in PRODUCTS)
    shops = ''.join(f'<li><span>{esc(n)}</span><span class="mono">{c[lang] if c else ""}</span></li>' for n, c in STOCKISTS)
    th = ''.join(f'<th>{h}</th>' for h in t['th'])
    head = json.dumps({'title': t['trade_title'], 'description': t['trade_desc'], 'nav': 'trade/'}, ensure_ascii=False)
    return f'''<!-- {head} -->
<section class="page-hero">
  <p class="kicker mono">{t['trade_kicker']}</p>
  <h1>{t['trade_h1']}</h1>
  <p class="lead">{t['trade_lead']}</p>
  <ul class="terms">
    <li><span class="mono">{t['min_order']}</span>{money(1000, lang)}</li>
    <li><span class="mono">{t['shipping']}</span>{t['shipping_v']}</li>
    <li><span class="mono">{t['cases_l']}</span>{t['cases_v']}</li>
  </ul>
  <div class="actions">
    <a class="btn" href="store/">{CHROME[lang]['store']}</a>
    <a class="btn btn-ghost" href="order/">{t['order_form']}</a>
  </div>
</section>

<section class="catalogue-section">
  <div class="section-head">
    <p class="kicker mono">{t['catalogue_kicker']}</p>
    <h2>{t['catalogue_h2']}</h2>
  </div>
  <table class="catalogue">
    <thead><tr>{th}</tr></thead>
    <tbody>{rows}
    </tbody>
  </table>
</section>

<section class="stockists-section">
  <div class="section-head">
    <p class="kicker mono">{t['stockists_kicker']}</p>
    <h2>{t['stockists_h2']}</h2>
  </div>
  <ul class="stockists">{shops}</ul>
</section>

<section class="contact-section" id="contact">
  <div class="section-head">
    <p class="kicker mono">{t['contact_kicker']}</p>
    <h2>{t['contact_h2']}</h2>
    <p>{t['contact_p']}</p>
  </div>
  <div class="contact">
    <div data-config-group>
      <p class="mono">{t['orders_partners']}</p>
      <a data-config="tradeEmail" data-fill href="#">george@rodel.fr</a>
    </div>
    <div data-config-group>
      <p class="mono">{t['general']}</p>
      <a data-config="email" data-fill href="#">info@rodel.fr</a>
    </div>
    <div>
      <p class="mono">{t['cannery']}</p>
      <address>2 rue Henri Fabre<br>29900 Concarneau, France</address>
    </div>
    <div>
      <p class="mono">{t['office']}</p>
      <address>Rödel SAS<br>14 rue Gambetta<br>78600 Le Mesnil-le-Roi, France</address>
    </div>
  </div>
</section>
'''


def store_page(lang):
    t = S[lang]
    cards = ''.join(f'''
    <li class="store-card" data-cat="{p['cat']}">
      <a class="store-card-media" href="store/{p['id']}/">{pack_img(p, lang)}<span class="tag mono">{t['b2b_only']}</span></a>
      <div class="store-card-copy">
        <p class="mono">{line_of(p, lang)} · {p['weight']}</p>
        <h3><a href="store/{p['id']}/">{esc(ptx(p, 'name', lang))}</a></h3>
        <p class="shop-name">{esc(ptx(p, 'shop', lang))}</p>
        <p class="price">{money(p['price'], lang)} <span class="mono">{t['per_tin']}</span></p>
        <p class="case mono">{t['case_of']} {p['units']} · {money(p['units'] * p['price'], lang)}</p>
        {buy(p, lang)}
      </div>
    </li>''' for p in PRODUCTS)
    head = json.dumps({'title': t['store_title'], 'description': t['store_desc'], 'nav': 'store/'}, ensure_ascii=False)
    return f'''<!-- {head} -->
<section class="page-hero store-hero">
  <p class="kicker mono">{t['store_kicker']}</p>
  <h1>{t['store_h1']}</h1>
  <p class="lead">{t['store_lead']}</p>
  <ul class="terms">
    <li><span class="mono">{t['min_order']}</span>{money(1000, lang)}</li>
    <li><span class="mono">{t['shipping']}</span>{t['shipping_v']}</li>
    <li><span class="mono">{t['ordering']}</span>{t['ordering_v']}</li>
  </ul>
  <div class="actions">
    <button class="btn" type="button" data-assortment data-href="cart/">{t['band_assort'].format(total=money(assortment_total(), lang))}</button>
    <a class="btn btn-ghost" href="order/">{t['b2b_form']}</a>
    <a class="btn btn-ghost" data-config="tradeEmail" href="#">{t['request_account']}</a>
  </div>
</section>

<section class="store">
  <div class="filters" role="group" aria-label="{t['filter']}">
    <button type="button" data-filter="all" aria-pressed="true">{t['all']}</button>
    <button type="button" data-filter="Sardines" aria-pressed="false">{t['cats']['Sardines']}</button>
    <button type="button" data-filter="Specialities" aria-pressed="false">{t['cats']['Specialities']}</button>
  </div>
  <ul class="store-grid">{cards}
  </ul>
  <div class="no-results" hidden><p class="statement-line">{t['no_results']}</p><p>{t['no_results_p']}</p></div>
</section>
'''


def product_page(p, lang):
    t = S[lang]
    name = ptx(p, 'name', lang)
    note = f"<p>{esc(ptx(p, 'note', lang))}</p>" if ptx(p, 'note', lang) else ''
    desc = f"{ptx(p, 'lead', lang)} {p['weight']}, {t['case_of'].lower()} {p['units']}."
    head = json.dumps({'title': t['p_title'].format(name=name), 'description': desc, 'nav': 'store/', 'product': p['id']}, ensure_ascii=False)
    return f'''<!-- {head} -->
<nav class="crumbs mono" aria-label="Breadcrumb"><a href="store/">{t['crumb']}</a><span aria-hidden="true">›</span><span aria-current="page">{esc(name)}</span></nav>
<article class="product-page">
  <figure class="pack">{pack_img(p, lang, '(max-width: 900px) 100vw, 50vw', eager=True)}</figure>
  <div class="product-copy">
    <p class="mono">{line_of(p, lang)} · {p['weight']} · <span class="tag-inline">{t['b2b_only']}</span></p>
    <h1>{esc(name)}</h1>
    <p class="shop-name">{esc(ptx(p, 'shop', lang))}</p>
    <p class="tin-text mono">{esc(p['tin'])}</p>
    <p class="price big">{money(p['price'], lang)} <span class="mono">{t['per_tin']}</span></p>
    <p class="case mono">{t['case_of']} {p['units']} {t['tins']} · {money(p['units'] * p['price'], lang)}</p>
    {buy(p, lang, True)}
    <p class="small-terms">{t['terms_line']}</p>
    <p class="lead">{esc(ptx(p, 'lead', lang))}</p>
    <p>{esc(ptx(p, 'desc', lang))}</p>
    {note}
    {facts([(t['net_weight'], p['weight']), (t['format'], fmt(p, lang)), (t['case'], f"{p['units']} {t['tins']}"), (t['ref'], p['ref']), (t['ean'], p['ean'])])}
    <a class="more" href="store/">{t['back']} <span aria-hidden="true">→</span></a>
  </div>
</article>
'''


def order_page(lang):
    t = S[lang]
    def rows(cat):
        return ''.join(f'''
        <tr data-id="{p['id']}">
          <td class="mono">{p['ref']}</td><td class="mono">{p['ean']}</td><td class="desc">{esc(ptx(p, 'b2b', lang))}</td>
          <td>{(f"{float(p['weight'].split()[0]) / 1000:.3f}".replace('.', ',') if lang == 'fr' else f"{float(p['weight'].split()[0]) / 1000:.3f}")} kg</td><td>{p['units']}</td><td>{money(p['price'], lang)}</td>
          <td>{stepper(t['cases_of'].format(name=esc(ptx(p, 'name', lang))), lang, 0, 0)}</td><td data-units>0</td><td data-total>{money(0, lang)}</td>
        </tr>''' for p in PRODUCTS if p['cat'] == cat)
    oth = ''.join(f'<th>{h}</th>' for h in t['oth'])
    head = json.dumps({'title': t['order_title'], 'description': t['order_desc'], 'nav': 'store/'}, ensure_ascii=False)
    return f'''<!-- {head} -->
<section class="page-hero">
  <p class="kicker mono">{t['order_kicker']}</p>
  <h1>{t['order_h1']}</h1>
  <p class="lead">{t['order_lead']}{t['terms_line']}</p>
</section>

<section class="order-section">
  <table class="order-table">
    <thead><tr>{oth}</tr></thead>
    <tbody>
      <tr class="group"><th colspan="9">{t['cats']['Sardines']}</th></tr>{rows('Sardines')}
      <tr class="group"><th colspan="9">{t['cats']['Specialities']}</th></tr>{rows('Specialities')}
    </tbody>
  </table>
  <div class="order-foot">
    <dl class="summary">
      <div><dt>{t['total_cases']}</dt><dd data-of="cases">0</dd></div>
      <div><dt>{t['total_units']}</dt><dd data-of="units">0</dd></div>
      <div class="grand"><dt>{t['total_price']}</dt><dd data-of="total">{money(0, lang)}</dd></div>
    </dl>
    <div class="progress" data-progress role="img" aria-label="{t['progress_label']}"><i></i><span class="mono"></span></div>
    <p class="minimum mono" data-of="minimum" role="status">{t['min_amount'].format(min=money(1000, lang))}</p>
    <button class="btn" type="button" data-of="add" data-href="cart/">{t['add_selected']}</button>
  </div>
</section>
'''


def cart_page(lang):
    t = S[lang]
    def field(name, label, kind='text', req=True, extra=''):
        opt = '' if req else t['optional']
        need = ' required' if req else ''
        if kind == 'area':
            control = f'<textarea name="{name}" rows="3" data-label="{label}"{need}></textarea>'
        else:
            control = f'<input type="{kind}" name="{name}" data-label="{label}"{need}{extra}>'
        return f'<label class="field"><span class="mono">{label}{opt}</span>{control}</label>'
    head = json.dumps({'title': t['cart_title'], 'description': t['cart_desc'], 'nav': 'store/'}, ensure_ascii=False)
    return f'''<!-- {head} -->
<section class="page-hero">
  <p class="kicker mono">{t['store_kicker']}</p>
  <h1>{t['cart_h1']}</h1>
  <p class="lead">{t['terms_line']}{t['cart_lead_extra']}</p>
</section>

<section class="cart-section">
  <div data-cart-empty>
    <p class="statement-line">{t['empty']}</p>
    <div class="actions"><a class="btn" href="store/">{CHROME[lang]['store']}</a><a class="btn btn-ghost" href="order/">{t['b2b_form']}</a></div>
  </div>

  <div class="cart-grid" data-cart-full hidden>
    <ul class="cart-lines" data-cart-lines></ul>
    <aside class="cart-aside">
      <dl class="summary" data-cart-summary></dl>
      <div class="progress" data-progress role="img" aria-label="{t['progress_label']}"><i></i><span class="mono"></span></div>
      <p class="minimum mono" data-cart-minimum role="status"></p>
      <form id="order-request" class="request">
        <p class="mono request-title">{t['request']}</p>
        {field('company', t['f_company'], extra=' autocomplete="organization"')}
        {field('vat', t['f_vat'])}
        {field('name', t['f_name'], extra=' autocomplete="name"')}
        {field('email', t['f_email'], 'email', extra=' autocomplete="email"')}
        {field('phone', t['f_phone'], 'tel', False, ' autocomplete="tel"')}
        {field('address', t['f_address'], 'area')}
        {field('message', t['f_message'], 'area', False)}
        <button class="btn" type="submit">{t['send']}</button>
        <p class="route" data-route></p>
        <p class="mono status" data-status role="status"></p>
        <label class="field" data-fallback hidden><span class="mono">{t['your_order']}</span><textarea rows="8" readonly></textarea></label>
      </form>
    </aside>
  </div>

  <div data-cart-done hidden>
    <p class="statement-line">{t['thanks']}</p>
    <p>{t['thanks_p']}</p>
  </div>
</section>
'''


def product_ld(p, lang, url):
    return [
        {'@context': 'https://schema.org', '@type': 'Product', 'name': f"Rödel {ptx(p, 'name', lang)}", 'sku': p['ref'], 'gtin13': p['ean'],
         'brand': {'@type': 'Brand', 'name': 'Rödel'}, 'image': SITE_URL + f"img/products/{p['id']}.webp",
         'description': ptx(p, 'desc', lang), 'category': line_of(p, lang),
         'weight': {'@type': 'QuantitativeValue', 'value': float(p['weight'].split()[0]), 'unitCode': 'GRM'}},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': S[lang]['crumb'], 'item': SITE_URL + PREFIX[lang] + 'store/'},
            {'@type': 'ListItem', 'position': 2, 'name': ptx(p, 'name', lang), 'item': url}]},
    ]


# ── page assembly ─────────────────────────────────────────────────────────

def pages(lang):
    src = lambda n: (ROOT / 'pages' / lang / f'{n}.html').read_text()
    return {
        '': src('home'), 'maison': src('maison'), 'sardines': src('sardines'), 'legal': src('legal'),
        'collection': collection_page(lang), 'trade': trade_page(lang), 'store': store_page(lang),
        **{f'store/{p["id"]}': product_page(p, lang) for p in PRODUCTS},
        'order': order_page(lang), 'cart': cart_page(lang),
    }


def render(lang, slug, src):
    meta = meta_head(src)
    body = re.sub(r'^<!-- \{.*?\} -->\n', '', src)
    extra_head, before = block(body, 'extra-head'), block(body, 'before-header')
    body = re.sub(r'<!-- (extra-head|before-header) -->\n.*?<!-- /\1 -->\n?', '', body, flags=re.S)
    body = re.sub(r'\{\{band:([a-z]+)\}\}', lambda m: BANDS[m.group(1)](lang), body)
    body = body.replace('{{gallery}}', gallery(lang))
    body = figs(body, lang)

    depth = (slug.count('/') + 1 if slug else 0) + (1 if lang == 'fr' else 0)
    asset_base = '../' * depth
    page_base = asset_base + PREFIX[lang]
    path = PREFIX[lang] + (slug + '/' if slug else '')
    url = SITE_URL + path
    other = 'fr' if lang == 'en' else 'en'
    other_href = (asset_base + PREFIX[other] + (slug + '/' if slug else '')) or './'

    header = chrome('header', lang)
    if meta.get('nav'):
        header = header.replace(f'href="{meta["nav"]}"', f'href="{meta["nav"]}" aria-current="page"')
    header = rebase(header, asset_base, page_base).replace(
        '{{lang-switch}}', f'<a class="lang" href="{other_href}" hreflang="{other}" lang="{other}" '
                           f'aria-label="{CHROME[lang]["switch_label"]}">{CHROME[lang]["switch_to"]}</a>')

    ld = jsonld(ORG)
    if meta.get('product'):
        p = next(x for x in PRODUCTS if x['id'] == meta['product'])
        ld += ''.join(jsonld(o) for o in product_ld(p, lang, url))
    alternates = ''.join(f'<link rel="alternate" hreflang="{l}" href="{SITE_URL}{PREFIX[l]}{slug + "/" if slug else ""}">\n' for l in LANGS)
    alternates += f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}{slug + "/" if slug else ""}">\n'
    body_class = 'home' if meta.get('body') == 'home' else f'page page-{slug.split("/")[0]}'

    page = f'''<!doctype html>
<html lang="{lang}" data-base="{asset_base}" data-pages="{page_base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(meta['title'])}</title>
<meta name="description" content="{esc(meta['description'])}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="{esc(meta['title'])}">
<meta property="og:description" content="{esc(meta['description'])}">
<meta property="og:image" content="{SITE_URL}og.png">
<meta property="og:locale" content="{'fr_FR' if lang == 'fr' else 'en_GB'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070d14">
<link rel="canonical" href="{url}">
{alternates}{ld}{rebase(chrome('head', lang), asset_base, page_base)}{rebase(extra_head, asset_base, page_base)}</head>
<body class="{body_class}">

{rebase(before, asset_base, page_base)}{header}
<main>
{rebase(body, asset_base, page_base)}
</main>

{rebase(chrome('footer', lang), asset_base, page_base)}</body>
</html>
'''
    out = ROOT / path / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    return path


# old rodel.fr addresses -> new pages, so links and bookmarks keep working at go-live
REDIRECTS = {
    'home': '', 'about': 'maison/', 'products': 'sardines/', 'gallery': 'maison/#archive',
    'contact-1': 'trade/#contact', 'b2b-order-form': 'order/', 'eshop': 'store/',
    'https/privacy2020cookie20policy': 'legal/',
    **{f'eshop/p/{p["old"]}': f'store/{p["id"]}/' for p in PRODUCTS},
}
REDIRECT_PAGE = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rödel</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{canon}">
<meta http-equiv="refresh" content="0; url={to}">
</head><body><p>This page has moved: <a href="{to}">continue</a>.</p></body></html>
'''

if __name__ == '__main__':
    written = []
    for lang in LANGS:
        for slug, src in pages(lang).items():
            written.append(render(lang, slug, src))
    for old, new in REDIRECTS.items():
        out = ROOT / old / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(REDIRECT_PAGE.format(canon=SITE_URL + new, to='../' * (old.count('/') + 1) + new))
    urls = [p for p in written if not p.endswith('cart/')]
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'  <url><loc>{SITE_URL}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    print(f'wrote {len(written)} pages ({len(written) // 2} per language), {len(REDIRECTS)} redirects, sitemap with {len(urls)} urls')
