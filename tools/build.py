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
    <a class="btn" data-config="shopUrl" href="#" rel="noopener">B2B store</a>
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
    <a class="btn" data-config="shopUrl" href="#" rel="noopener">B2B store</a>
    <a class="btn btn-ghost" data-config="orderFormUrl" href="#" rel="noopener">Order form</a>
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
    <p class="kicker mono">Contact</p>
    <h2>Let’s grow <br><em>together.</em></h2>
    <p>Whether you have a question, an idea or an order; a business proposal or a partnership: let’s talk.</p>
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


PAGES = {
    'maison': (ROOT / 'pages' / 'maison.html').read_text(),
    'sardines': (ROOT / 'pages' / 'sardines.html').read_text(),
    'collection': collection_page(),
    'trade': trade_page(),
    'legal': (ROOT / 'pages' / 'legal.html').read_text(),
}

for slug, src in PAGES.items():
    meta = json.loads(re.match(r'<!-- (\{.*?\}) -->', src).group(1))
    body = figs(re.sub(r'^<!-- \{.*?\} -->\n', '', src))
    header = chrome('header')
    if meta['nav']:
        header = header.replace(f'href="{meta["nav"]}"', f'href="{meta["nav"]}" aria-current="page"')
    page = f'''<!doctype html>
<html lang="en" data-base="../">
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
{rebase(chrome('head'), '../')}</head>
<body class="page page-{slug}">

{rebase(header, '../')}
<main>
{rebase(body, '../')}
</main>

{rebase(chrome('footer'), '../')}</body>
</html>
'''
    out = ROOT / slug / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print('wrote', out.relative_to(ROOT))

urls = [''] + [f'{s}/' for s in PAGES]
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{SITE_URL}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
print('wrote sitemap.xml with', len(urls), 'urls')
