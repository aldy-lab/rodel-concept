"""Generate the sub-pages from index.html's chrome, and the sitemap.

Head, header and footer are lifted out of index.html (between chrome markers),
so they can't drift between pages. Maison, Sardines and Legal come from
pages/*.html; Collection and Trade are generated from js/products.js.

    python3 tools/build.py
"""
import html, json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = 'https://aldy-lab.github.io/rodel-concept/'
ASSETS = json.loads((ROOT / 'tools' / 'assets.json').read_text())
PRODUCTS = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e',
     f"import('{(ROOT / 'js' / 'products.js').as_uri()}').then(m => console.log(JSON.stringify(m.PRODUCTS)))"]))
INDEX = (ROOT / 'index.html').read_text()


def chrome(name):
    m = re.search(rf'<!-- chrome:{name} -->\n(.*?)<!-- /chrome:{name} -->', INDEX, re.S)
    return m.group(1)


def rebase(text, base):
    """Prefix relative URLs so a page one folder down still finds the assets."""
    skip = ('http:', 'https:', 'mailto:', 'tel:', '#', 'data:', '/', '../')
    def one(url):
        url = url.strip()
        if not url or url.startswith(skip):
            return url
        return base if url == './' else base + url
    def attr(m):
        name, val = m.group(1), m.group(2)
        if name == 'srcset':
            val = ', '.join(' '.join([one(part.split()[0])] + part.split()[1:]) for part in val.split(','))
        else:
            val = one(val)
        return f'{name}="{val}"'
    return re.sub(r'\b(href|src|srcset)="([^"]*)"', attr, text)


def fig(slug, cls=''):
    a = ASSETS['archive'][slug]
    w, h = a['w'], a['h']
    w8, h8 = (800, round(h * 800 / w)) if w > 800 else (w, h)
    cap = f"<figcaption>{html.escape(a['caption'])}</figcaption>" if a['caption'] else ''
    return (f'<figure class="{f"plate {cls}".strip()}"><img src="img/archive/{slug}-800.webp" '
            f'srcset="img/archive/{slug}-800.webp {w8}w, img/archive/{slug}.webp {w}w" '
            f'sizes="(max-width: 900px) 100vw, 46vw" width="{w8}" height="{h8}" '
            f'alt="{html.escape(a["alt"])}" loading="lazy" decoding="async">{cap}</figure>')


def figs(text):
    return re.sub(r'\{\{fig:([a-z0-9-]+)(?:\|([a-z0-9 -]+))?\}\}', lambda m: fig(m.group(1), m.group(2) or ''), text)


def facts(rows):
    return '<dl class="facts">' + ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in rows) + '</dl>'


def collection_page():
    lines = []
    for line in ['Millésime', 'Recipes of the house', 'Specialities']:
        items = []
        for p in [p for p in PRODUCTS if p['line'] == line]:
            note = f"<p>{html.escape(p['note'])}</p>" if p.get('note') else ''
            case = f"{p['units']} per case"
            items.append(f'''
    <article class="product-row" id="{p['id']}">
      <figure class="pack"><img src="img/products/{p['id']}-600.webp" srcset="img/products/{p['id']}-600.webp 600w, img/products/{p['id']}.webp 1200w" sizes="(max-width: 900px) 100vw, 44vw" width="600" height="450" alt="Rödel {html.escape(p['name'])}, photographed from above" loading="lazy" decoding="async"></figure>
      <div class="product-copy">
        <p class="mono">{html.escape(p['line'])} · {p['weight']}</p>
        <h3>{html.escape(p['name'])}</h3>
        <p class="tin-text mono">{html.escape(p['tin'])}</p>
        <p class="lead">{html.escape(p['lead'])}</p>
        <p>{html.escape(p['desc'])}</p>
        {note}
        {facts([('Net weight', p['weight']), ('Format', p['format']), ('Case', case), ('Ref.', p['ref']), ('EAN', p['ean'])])}
      </div>
    </article>''')
        lines.append(f'''
  <section class="line">
    <h2 class="line-title"><span class="mono">{len(items):02d}</span>{html.escape(line)}</h2>{''.join(items)}
  </section>''')
    return f'''<!-- {{"title": "Collection | Rödel", "description": "The Rödel collection: Millésime sardines, recipes of the house and specialities, packed by hand in Concarneau.", "nav": "collection/"}} -->
<section class="page-hero">
  <p class="kicker mono">The collection</p>
  <h1>Nine tins, <br><em>one standard.</em></h1>
  <p class="lead">Every tin is filled by hand in Concarneau, from sardines caught the same morning and never frozen.</p>
</section>
{''.join(lines)}
<section class="closing">
  <p class="mono">Professionals</p>
  <h2>Order through <br><em>the B2B store.</em></h2>
  <div class="actions" data-config-group>
    <a class="btn" href="store/">B2B store</a>
    <a class="btn btn-ghost" href="trade/">Terms &amp; catalogue</a>
  </div>
</section>
'''


STOCKISTS = [
    ('La Grande Épicerie de Paris', 'Paris'), ('Galeries Lafayette Haussmann', 'Paris'),
    ('Gillardeau La Boutique', ''), ('Kaviari Delikatessen', ''),
    ('Maison Rolle, Halles de Lyon Paul Bocuse', 'Lyon'), ('Julius Meinl am Graben', 'Vienna'),
    ('Maison Arostéguy', 'Biarritz'), ('L’Échoppe de la Lune', 'Bordeaux'),
    ('Maison Janicot', 'Sète'), ('Les Accords Parfaits', ''), ('Grand Marché Marnière', ''),
    ('Izraël', ''), ('Épicerie de Longueil', ''), ('Maison Gabriella Delicatessen', ''),
]


def trade_page():
    rows = ''.join(f'''
      <tr><td class="mono">{p['ref']}</td><td>{html.escape(p['b2b'])}</td><td>{p['weight']}</td><td>{p['units']}</td><td class="mono">{p['ean']}</td></tr>''' for p in PRODUCTS)
    shops = ''.join(f'<li><span>{html.escape(n)}</span><span class="mono">{c}</span></li>' for n, c in STOCKISTS)
    return f'''<!-- {{"title": "Trade | Rödel", "description": "Rödel for professional partners: B2B store, terms, trade catalogue with references and EAN codes, stockists and contact.", "nav": "trade/"}} -->
<section class="page-hero">
  <p class="kicker mono">Trade</p>
  <h1>For professional <br><em>partners.</em></h1>
  <p class="lead">Access to the e-shop is reserved for professional partners and resale orders.</p>
  <ul class="terms">
    <li><span class="mono">Minimum order</span>€1,000</li>
    <li><span class="mono">Shipping</span>At the customer’s expense</li>
    <li><span class="mono">Cases</span>12 tins, 15 for the 69 g</li>
  </ul>
  <div class="actions" data-config-group>
    <a class="btn" href="store/">B2B store</a>
    <a class="btn btn-ghost" href="order/">Order form</a>
  </div>
</section>

<section class="catalogue-section">
  <div class="section-head">
    <p class="kicker mono">Trade catalogue</p>
    <h2>References <br><em>and codes.</em></h2>
  </div>
  <table class="catalogue">
    <thead><tr><th>Ref.</th><th>Product</th><th>Net weight</th><th>Per case</th><th>EAN</th></tr></thead>
    <tbody>{rows}
    </tbody>
  </table>
</section>

<section class="stockists-section">
  <div class="section-head">
    <p class="kicker mono">Stockists</p>
    <h2>Where to find <br><em>Rödel.</em></h2>
  </div>
  <ul class="stockists">{shops}</ul>
</section>

<section class="contact-section" id="contact">
  <div class="section-head">
    <p class="kicker mono">Start your next adventure</p>
    <h2>Let’s grow <br><em>together.</em></h2>
    <p>Whether you have a question, an idea, or just want to place an order; if you have a business proposal or want to become our partner: let’s start to talk.</p>
  </div>
  <div class="contact">
    <div data-config-group>
      <p class="mono">Orders &amp; partnerships</p>
      <a data-config="tradeEmail" data-fill href="#">george@rodel.fr</a>
    </div>
    <div data-config-group>
      <p class="mono">General enquiries</p>
      <a data-config="email" data-fill href="#">info@rodel.fr</a>
    </div>
    <div>
      <p class="mono">Cannery</p>
      <address>2 rue Henri Fabre<br>29900 Concarneau, France</address>
    </div>
    <div>
      <p class="mono">Registered office</p>
      <address>Rödel SAS<br>14 rue Gambetta<br>78600 Le Mesnil-le-Roi, France</address>
    </div>
  </div>
</section>
'''


def money(v):
    """Must print what js/products.js money() prints (Intl en-GB, EUR)."""
    return f'€{v:,.2f}'


def stepper(label, value=1, minimum=1):
    return (f'<div class="stepper" role="group" aria-label="{label}">'
            f'<button type="button" data-step="-1" aria-label="One case fewer">−</button>'
            f'<input type="number" name="cases" inputmode="numeric" min="{minimum}" max="999" value="{value}" aria-label="Cases">'
            f'<button type="button" data-step="1" aria-label="One case more">+</button></div>')


def buy(p, big=False):
    return (f'<form class="buy{" big" if big else ""}" data-id="{p["id"]}">'
            f'{stepper("Cases of " + html.escape(p["name"]))}'
            f'<button class="btn" type="submit">Add to cart</button>'
            f'<p class="added mono" role="status" hidden></p></form>')


def pack_img(p, sizes='(max-width: 900px) 100vw, 30vw', eager=False):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="img/products/{p["id"]}-600.webp" srcset="img/products/{p["id"]}-600.webp 600w, img/products/{p["id"]}.webp 1200w" '
            f'sizes="{sizes}" width="600" height="450" alt="Rödel {html.escape(p["name"])}, photographed from above" {load} decoding="async">')


TERMS_LINE = 'Shipping costs are always at the customer’s expense. The minimum order is €1,000.'


def store_page():
    cards = ''.join(f'''
    <li class="store-card" data-cat="{p['cat']}">
      <a class="store-card-media" href="store/{p['id']}/">{pack_img(p)}<span class="tag mono">B2B only</span></a>
      <div class="store-card-copy">
        <p class="mono">{p['line']} · {p['weight']}</p>
        <h3><a href="store/{p['id']}/">{html.escape(p['name'])}</a></h3>
        <p class="shop-name">{html.escape(p['shop'])}</p>
        <p class="price">{money(p['price'])} <span class="mono">per tin</span></p>
        <p class="case mono">Case of {p['units']} · {money(p['units'] * p['price'])}</p>
        {buy(p)}
      </div>
    </li>''' for p in PRODUCTS)
    return f'''<!-- {{"title": "B2B Store | Rödel", "description": "The Rödel B2B store: Millésime sardines, recipes of the house and specialities, by the case, for professional partners.", "nav": "store/"}} -->
<section class="page-hero store-hero">
  <p class="kicker mono">B2B Store</p>
  <h1>B2B <em>shop.</em></h1>
  <p class="lead">Access to our e-shop is reserved for professional partners and resale orders. We thank you for your understanding.</p>
  <ul class="terms">
    <li><span class="mono">Minimum order</span>€1,000</li>
    <li><span class="mono">Shipping</span>At the customer’s expense</li>
    <li><span class="mono">Ordering</span>By the case; confirmed by the house</li>
  </ul>
  <div class="actions">
    <a class="btn btn-ghost" href="order/">B2B order form</a>
    <a class="btn btn-ghost" data-config="tradeEmail" href="#">Request a trade account</a>
  </div>
</section>

<section class="store">
  <div class="filters" role="group" aria-label="Filter">
    <button type="button" data-filter="all" aria-pressed="true">All</button>
    <button type="button" data-filter="Sardines" aria-pressed="false">Sardines</button>
    <button type="button" data-filter="Specialities" aria-pressed="false">Specialities</button>
  </div>
  <ul class="store-grid">{cards}
  </ul>
  <div class="no-results" hidden><p class="statement-line">No results found</p><p>No results match your search. Try removing a few filters.</p></div>
</section>
'''


def product_page(p):
    note = f"<p>{html.escape(p['note'])}</p>" if p.get('note') else ''
    return f'''<!-- {{"title": "{html.escape(p['name'])} | Rödel B2B Store", "description": "{html.escape(p['lead'])} {p['weight']}, case of {p['units']}.", "nav": "store/"}} -->
<nav class="crumbs mono" aria-label="Breadcrumb"><a href="store/">B2B Store</a><span aria-hidden="true">›</span><span aria-current="page">{html.escape(p['name'])}</span></nav>
<article class="product-page">
  <figure class="pack">{pack_img(p, '(max-width: 900px) 100vw, 50vw', eager=True)}</figure>
  <div class="product-copy">
    <p class="mono">{p['line']} · {p['weight']} · <span class="tag-inline">B2B only</span></p>
    <h1>{html.escape(p['name'])}</h1>
    <p class="shop-name">{html.escape(p['shop'])}</p>
    <p class="tin-text mono">{html.escape(p['tin'])}</p>
    <p class="price big">{money(p['price'])} <span class="mono">per tin</span></p>
    <p class="case mono">Case of {p['units']} tins · {money(p['units'] * p['price'])}</p>
    {buy(p, True)}
    <p class="small-terms">{TERMS_LINE}</p>
    <p class="lead">{html.escape(p['lead'])}</p>
    <p>{html.escape(p['desc'])}</p>
    {note}
    {facts([('Net weight', p['weight']), ('Format', p['format']), ('Case', f"{p['units']} tins"), ('Ref.', p['ref']), ('EAN', p['ean'])])}
    <a class="more" href="store/">Back to the store <span aria-hidden="true">→</span></a>
  </div>
</article>
'''


def order_page():
    def rows(cat):
        return ''.join(f'''
        <tr data-id="{p['id']}">
          <td class="mono">{p['ref']}</td><td class="mono">{p['ean']}</td><td class="desc">{html.escape(p['b2b'])}</td>
          <td>{float(p['weight'].split()[0]) / 1000:.3f} kg</td><td>{p['units']}</td><td>{money(p['price'])}</td>
          <td>{stepper('Cases of ' + html.escape(p['name']), 0, 0)}</td><td data-units>0</td><td data-total>{money(0)}</td>
        </tr>''' for p in PRODUCTS if p['cat'] == cat)
    return f'''<!-- {{"title": "B2B order form | Rödel", "description": "The Rödel B2B order form: references, GENCOD, case sizes and unit prices.", "nav": "store/"}} -->
<section class="page-hero">
  <p class="kicker mono">B2B order form</p>
  <h1>Order <em>by the case.</em></h1>
  <p class="lead">B2B ordering terms: {TERMS_LINE}</p>
</section>

<section class="order-section">
  <table class="order-table">
    <thead><tr><th>Ref</th><th>GENCOD</th><th>Description</th><th>Net weight</th><th>Units / case</th><th>Unit price</th><th>Order (cases)</th><th>Total units</th><th>Total price</th></tr></thead>
    <tbody>
      <tr class="group"><th colspan="9">Sardines</th></tr>{rows('Sardines')}
      <tr class="group"><th colspan="9">Specialities</th></tr>{rows('Specialities')}
    </tbody>
  </table>
  <div class="order-foot">
    <dl class="summary">
      <div><dt>Total cases</dt><dd data-of="cases">0</dd></div>
      <div><dt>Total units</dt><dd data-of="units">0</dd></div>
      <div class="grand"><dt>Total price</dt><dd data-of="total">{money(0)}</dd></div>
    </dl>
    <p class="minimum mono" data-of="minimum" role="status">Minimum order amount is {money(1000)}.</p>
    <button class="btn" type="button" data-of="add" data-href="cart/">Add selected items to cart</button>
  </div>
</section>
'''


def cart_page():
    def field(name, label, kind='text', req=True, extra=''):
        opt = '' if req else ' (optional)'
        need = ' required' if req else ''
        if kind == 'area':
            control = f'<textarea name="{name}" rows="3" data-label="{label}"{need}></textarea>'
        else:
            control = f'<input type="{kind}" name="{name}" data-label="{label}"{need}{extra}>'
        return f'<label class="field"><span class="mono">{label}{opt}</span>{control}</label>'
    return f'''<!-- {{"title": "Cart | Rödel B2B Store", "description": "Your Rödel B2B order request.", "nav": "store/"}} -->
<section class="page-hero">
  <p class="kicker mono">B2B Store</p>
  <h1>Your <em>order.</em></h1>
  <p class="lead">{TERMS_LINE} Orders are sent as a request; the house confirms availability, delivery and invoice.</p>
</section>

<section class="cart-section">
  <div data-cart-empty>
    <p class="statement-line">Your cart is empty.</p>
    <div class="actions"><a class="btn" href="store/">B2B store</a><a class="btn btn-ghost" href="order/">B2B order form</a></div>
  </div>

  <div class="cart-grid" data-cart-full hidden>
    <ul class="cart-lines" data-cart-lines></ul>
    <aside class="cart-aside">
      <dl class="summary" data-cart-summary></dl>
      <p class="minimum mono" data-cart-minimum role="status"></p>
      <form id="order-request" class="request">
        <p class="mono request-title">Order request</p>
        {field('company', 'Company', extra=' autocomplete="organization"')}
        {field('vat', 'VAT number')}
        {field('name', 'Contact name', extra=' autocomplete="name"')}
        {field('email', 'Email', 'email', extra=' autocomplete="email"')}
        {field('phone', 'Phone', 'tel', False, ' autocomplete="tel"')}
        {field('address', 'Delivery address', 'area')}
        {field('message', 'Message', 'area', False)}
        <button class="btn" type="submit">Send the order request</button>
        <p class="route" data-route></p>
        <p class="mono status" data-status role="status"></p>
        <label class="field" data-fallback hidden><span class="mono">Your order</span><textarea rows="8" readonly></textarea></label>
      </form>
    </aside>
  </div>

  <div data-cart-done hidden>
    <p class="statement-line">Thank you. The order request for <span data-done-company></span> has been sent.</p>
    <p>The house will confirm availability, delivery and invoice by email.</p>
  </div>
</section>
'''


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


PAGES = {
    'maison': (ROOT / 'pages' / 'maison.html').read_text(),
    'sardines': (ROOT / 'pages' / 'sardines.html').read_text(),
    'collection': collection_page(),
    'trade': trade_page(),
    'legal': (ROOT / 'pages' / 'legal.html').read_text(),
    'store': store_page(),
    **{f'store/{p["id"]}': product_page(p) for p in PRODUCTS},
    'order': order_page(),
    'cart': cart_page(),
}

for slug, src in PAGES.items():
    meta = json.loads(re.match(r'<!-- (\{.*?\}) -->', src).group(1))
    body = figs(re.sub(r'^<!-- \{.*?\} -->\n', '', src))
    base = '../' * (slug.count('/') + 1)
    header = chrome('header')
    if meta['nav']:
        header = header.replace(f'href="{meta["nav"]}"', f'href="{meta["nav"]}" aria-current="page"')
    page = f'''<!doctype html>
<html lang="en" data-base="{base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(meta['title'])}</title>
<meta name="description" content="{html.escape(meta['description'])}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="{html.escape(meta['title'])}">
<meta property="og:description" content="{html.escape(meta['description'])}">
<meta property="og:image" content="{SITE_URL}og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070d14">
<link rel="canonical" href="{SITE_URL}{slug}/">
{rebase(chrome('head'), base)}</head>
<body class="page page-{slug}">

{rebase(header, base)}
<main>
{rebase(body, base)}
</main>

{rebase(chrome('footer'), base)}</body>
</html>
'''
    out = ROOT / slug / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print('wrote', out.relative_to(ROOT))

for old, new in REDIRECTS.items():
    out = ROOT / old / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(REDIRECT_PAGE.format(canon=SITE_URL + new, to='../' * (old.count('/') + 1) + new))
print('wrote', len(REDIRECTS), 'redirects')

urls = [''] + [f'{s}/' for s in PAGES if s != 'cart']
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{SITE_URL}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
print('wrote sitemap.xml with', len(urls), 'urls')
