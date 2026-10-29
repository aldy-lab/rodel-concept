# Rödel — concept redesign

An unofficial concept for [rodel.fr](https://www.rodel.fr/) by ALDY Studio. It is not affiliated with Rödel SAS, and every page is set to `noindex`.

A static site with no build step to serve it. The text, product data and photographs come from rodel.fr (crawled 29 Oct 2026).

## Pages

| Page | Content |
|---|---|
| `/` | The 3D story: the shoal, the open tin, the Millésime, the collection (real lids), the history, stockists |
| `/maison/` | The full history from the About page, plus the archive from the Gallery |
| `/sardines/` | The Secret of Perfection: season, waters, cannery, fishermen and method |
| `/collection/` | All nine products: pack shot, tin wording, description, ref, EAN, weight, case |
| `/trade/` | B2B terms, the trade catalogue, stockists, contacts |
| `/legal/` | Mentions légales |
| `/store/` | B2B store: nine products, filter, add by the case |
| `/store/<product>/` | Product page: price per tin and per case, add to cart, ref and EAN |
| `/order/` | The B2B order form: ref, GENCOD, units/case, unit price, live totals, €1,000 minimum |
| `/cart/` | Cart and order request (company, VAT, delivery address) |

Every old rodel.fr address (`/about`, `/products`, `/gallery`, `/contact-1`, `/b2b-order-form`, `/eshop`, `/eshop/p/…`, the privacy page) has a redirect page to its new home, so links keep working once the domain moves.

## The B2B store

There is no payment on the site, by design. The cart lives in the visitor's browser (`localStorage`), and checkout sends an **order request**, which the house confirms, matching their B2B terms.

- `CONFIG.orderEndpoint` blank (now): the request opens an email to `tradeEmail` with the order written out, and a copyable fallback if no mail app opens.
- `CONFIG.orderEndpoint` set (a Formspree or Basin form URL): the request is POSTed as JSON and the cart clears.

Trade accounts and sign-in from the Squarespace store cannot carry over. "Request a trade account" emails george@.

**Phones** don't load Three.js. They get stills rendered from the same models and the real pack shots.

## Languages

The whole site exists in English (`/`) and French (`/fr/`), with a FR/EN switch on every page that leads to the same page in the other language, plus `hreflang` links. In France the Toubon law requires commercial terms, prices and order forms to be in French for French buyers.

- Page bodies: `pages/en/*.html` and `pages/fr/*.html`
- Shared head, header, footer and dock: `templates/chrome.html`, labels in `tools/i18n.py`
- Generated pages (collection, trade, store, product pages, order form, cart) and archive captions: `tools/i18n.py`
- Product texts: `js/products.js` (English in `PRODUCTS`, French in `FR`)
- Script strings: `js/i18n.js`

The French is a faithful translation of Rödel's copy. **Have a native speaker proofread it before launch.** It is worth deciding with the client whether French should be the default language at the domain root.

## Tools

    python3 -m http.server 8731            # serve
    python3 tools/build.py                 # regenerate all 36 pages (both languages), redirects and sitemap
    python3 tools/import_assets.py <dir>   # re-import photos from a rodel.fr download folder
    python3 tools/stills.py                # re-render the phone stills (server must be running)

Product data lives in one place, `js/products.js`. It drives the 3D tabs, the home collection grid, `/collection/`, `/trade/`, the store, product pages, the order form and the cart. Every page is generated, `index.html` included: edit `pages/` and `templates/`, never the output.

**Structured data:** Organization on every page; Product (brand, GTIN-13/EAN, SKU, weight) and BreadcrumbList on product pages. Empty fields are stripped. Prices are left out of the markup because they are trade prices.

All go-live values sit in the `CONFIG` block at the top of `js/main.js`. Leave a value blank and its link is removed from the page.

## Open with the client

- **Millésime year:** the boneless tin in the photograph is printed *Millésime 2024*; the site text says *Millésime 2025 Boneless*. It is named "Millésime Boneless" here until they confirm.
- **Claims to confirm:** "the oldest cannery brand in the world"; supplier to the Emperor of Brazil, Lord Mountbatten and Theodore Roosevelt; hand-boned sardines "conceived for the royal court". These are kept as Rödel's own wording.
- **Certification badges** (MSC, Produit en Bretagne, Eco Friendly) sit on their products page with no stated certificate. They are left out here until licences are shown.
- **Images left out**, and why, are listed in `tools/assets.json` under `excluded`: AI-generated images, stock photos, other shops' storefronts, collage slides, unnamed portraits, low-resolution files.
- **Photos needed:** Philippe Hass (only a 320 px video still exists), and names for the two unidentified portraits.
- **Edits to their copy:** "rue du Public Jardin" became *rue du Jardin Public*, and "Port-Marie" became *Port-Maria* (as printed on their own postcard). Grammar was lightly corrected throughout.
- **Two price lists on rodel.fr.** The order form gives trade unit prices (Boneless €4.50); the e-shop lists exactly double (€9.00), except the 69 g tin (€3.30 vs €5.90). The store uses the order-form prices; the e-shop figures are kept in `js/products.js` as `eshop`. Ask which list is current, and whether prices are excl. VAT.
- **Data retention:** the legal notice keeps their "6 months after last contact". Order requests are commercial records with their own retention rules; confirm with the client.
- **Two addresses:** george@rodel.fr is used for orders and partnerships (their contact page), and info@rodel.fr for general enquiries and personal data (their legal notice).
- **Legal notice:** the hosting and third-party lines describe this concept (GitHub Pages, Google Fonts, jsDelivr). Update them at go-live; self-hosting the fonts would remove the Google Fonts disclosure.

## Text coverage

202 of the 211 sentences on rodel.fr are on this site, checked by matching every sentence. The 9 not moved are deliberate: the Squarespace hosting lines and "Created in-house by RODEL SAS" (no longer true), the contact-form and cookie sentences (rewritten for the order request and local storage), and "Follow us on social" (it appears once an Instagram URL is set in `CONFIG`).

Easter egg: type `1824` on the home page.
