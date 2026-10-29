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

**Phones** don't load Three.js. They get stills rendered from the same models and the real pack shots.

## Tools

    python3 -m http.server 8731            # serve
    python3 tools/build.py                 # regenerate the sub-pages + sitemap from index.html chrome
    python3 tools/import_assets.py <dir>   # re-import photos from a rodel.fr download folder
    python3 tools/stills.py                # re-render the phone stills (server must be running)

Product data lives in one place, `js/products.js`. It drives the 3D tabs, the phone cards, `/collection/` and `/trade/`.

All go-live values sit in the `CONFIG` block at the top of `js/main.js`. Leave a value blank and its link is removed from the page.

## Open with the client

- **Millésime year:** the boneless tin in the photograph is printed *Millésime 2024*; the site text says *Millésime 2025 Boneless*. It is named "Millésime Boneless" here until they confirm.
- **Claims to confirm:** "the oldest cannery brand in the world"; supplier to the Emperor of Brazil, Lord Mountbatten and Theodore Roosevelt; hand-boned sardines "conceived for the royal court". These are kept as Rödel's own wording.
- **Certification badges** (MSC, Produit en Bretagne, Eco Friendly) sit on their products page with no stated certificate. They are left out here until licences are shown.
- **Images left out**, and why, are listed in `tools/assets.json` under `excluded`: AI-generated images, stock photos, other shops' storefronts, collage slides, unnamed portraits, low-resolution files.
- **Photos needed:** Philippe Hass (only a 320 px video still exists), and names for the two unidentified portraits.
- **Edits to their copy:** "rue du Public Jardin" became *rue du Jardin Public*, and "Port-Marie" became *Port-Maria* (as printed on their own postcard). Grammar was lightly corrected throughout.
- **B2B prices** are not published here, although their order form shows them publicly.
- **Two addresses:** george@rodel.fr is used for orders and partnerships (their contact page), and info@rodel.fr for general enquiries and personal data (their legal notice).
- **Legal notice:** the hosting and third-party lines describe this concept (GitHub Pages, Google Fonts, jsDelivr). Update them at go-live; self-hosting the fonts would remove the Google Fonts disclosure.

Easter egg: type `1824` on the home page.
