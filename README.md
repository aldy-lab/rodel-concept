# Rödel — concept redesign

An unofficial concept for [rodel.fr](https://www.rodel.fr/) by ALDY Studio. It is not affiliated with Rödel SAS, and the page is set to `noindex`.

A static site with no build step. Everything 3D is generated in code with Three.js 0.170, loaded from jsDelivr. No photos or logos from Rödel are used.

- **Hero:** a shoal of procedural sardines (one instanced mesh, tail beat in the vertex shader).
- **01 Method:** five fish leave the shoal and settle head-to-tail in an open tin.
- **02 Millésime:** the lid closes on a printed label.
- **03 Collection:** five products. Each one redraws the lid print and repaints the tin. Drag to turn the tin.
- **04 History:** a timeline measured from 1824 to 2026.
- **05 Trade & contact.**

Easter egg: type `1824`.

**Phones** don't load Three.js. The page uses stills rendered from the same models in `img/`, one card per product with an order link, and a bottom bar with the B2B store and Contact. To regenerate the stills after changing a model or label, serve the repo and run `python3 tools/stills.py`.

## Run

    python3 -m http.server 8000

## Go-live values

All go-live values sit in the `CONFIG` block at the top of `js/main.js`. Leave a value blank and its link is removed from the page.

## Open with the client

- The live site shows `george@rodel.fr` but links to `info@rodel.fr`. Which address is right?
- "Oldest sardine house in the world" is Rödel's own claim. It needs their sign-off before it goes in a headline.
- The Chica Pica date ("c. 1905") is inferred from "early 20th century". The real year is needed.
- The house is in Le Mesnil-le-Roi and the packing is in Brittany, but no cannery or town is named. Name it if they want to.
- Real pack weights. Only the 69 g tin is stated on their site.
