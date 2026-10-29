// The Rödel collection, from rodel.fr: product copy from the home and e-shop
// pages, trade data (ref, EAN, weight, case, unit price) from the B2B order
// form, and the wording printed on each tin.
//   price — trade price per tin from the B2B order form; the store and cart use it
//   eshop — the price the old e-shop listed (about double; kept for the client to reconcile)
//   old   — the product's slug on rodel.fr, for redirects

export const PRODUCTS = [
  {
    id: 'millesime', line: 'Millésime', name: 'Millésime 2025', tin: 'Sardines à l’huile d’olive vierge extra · Millésime 2025',
    lead: 'The cornerstone of the art of preservation.',
    desc: 'This product formed the very cornerstone of the art of preservation and served as the benchmark for all other canneries. Created by Charles Rödel’s son, it followed a precise and unmistakable method, ensuring a taste and quality that may be preserved, and savoured, even after ten years.',
    note: 'Rödel Vintage Sardines harmoniously balance the savory flavor of high-quality fish resourcefully sourced from prime sardine populations with the subtlety of premium olive oil. The sardines embody a strong aroma, carrying whispers of the pristine waters they were naturally bred in.',
    shop: 'Sardines Millésime',
    b2b: 'Sardines in olive oil 1/6 - 115 g Millésimées', price: 4.20, eshop: 8.40, cat: 'Sardines', old: 'sardines-millsime', ref: '510017', ean: '3022655100178', weight: '115 g', format: '1/6', units: 12, paint: '#b3121a',
  },
  {
    id: 'millesime-boneless', line: 'Millésime', name: 'Millésime Boneless', tin: 'Sardines sans arêtes à l’huile d’olive vierge extra',
    lead: 'Hand-boned, as once prepared for the royal court.',
    desc: 'The finest sardines of each vintage are prepared without delay, on the very day of their catch. Hand-boned sardines were conceived for the royal court, where it was deemed unthinkable that even the most delicate bone might trouble the noble throats of its distinguished guests.',
    note: 'Select sardines in extra virgin olive oil, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    shop: 'Sardines Millésime Boneless',
    b2b: 'Sardines without bones in olive oil 1/6 - 115 g Millésimées', price: 4.50, eshop: 9.00, cat: 'Sardines', old: 'sardines-millsime-boneless', ref: '510021', ean: '3022655100215', weight: '115 g', format: '1/6', units: 12, paint: '#121212',
  },
  {
    id: 'chica-pica', line: 'Recipes of the house', name: 'Chica Pica', tin: 'Sardines Chica Pica à l’huile d’olive vierge extra & aux aromates',
    lead: 'A secret spice blend, and a registered trademark of the house.',
    desc: 'Chica Pica, “wild girl”: a secret spice blend created for Rödel in the early 20th century by a Venezuelan friend. A registered trademark and enduring culinary signature of the House.',
    note: 'These gourmet sardines are imbued with a delightful aroma that is characteristic of high-quality seafood. The sardines are infused with the original Chica Pica herb blend. The infusion of a blend of unique aromates, including carrot, pickle, chili, white pepper, clove, and laurel, collectively contribute to the distinctive aroma of the product. The taste profile is rich and full-flavored, with a slightly salty and smoky taste that adds depth and complexity.',
    shop: 'Sardines with Chica Pica spice',
    b2b: 'Sardines with Chica Pica aromas 1/6 - 115 g', price: 4.60, eshop: 9.20, cat: 'Sardines', old: 'sardines-with-chica-pica-spice', ref: '510223', ean: '3022655102233', weight: '115 g', format: '1/6', units: 12, paint: '#1b3c9e',
  },
  {
    id: 'citron', line: 'Recipes of the house', name: 'Citron', tin: 'Sardines à l’huile d’olive vierge extra au citron',
    lead: 'Extra virgin olive oil and a whole sun-ripened lemon.',
    desc: 'Combination that lasts for centuries. Fish and lemon form a classic harmony, much like love and marriage in a timeless jazz refrain. Combined with extra virgin olive oil and a sun-ripened whole lemon, they create an unforgettable, timeless taste.',
    note: 'The tasting journey begins with an immediate hit of intensely fresh sardine flavor. This maritime note is the epitome of quality seafood - pure, clean, and unadulterated. The olive oil’s presence serves to mellow and enrich this initial burst, adding a velvety texture and a delightful hint of richness. The lemon essence doesn’t compete with the sardines and olive oil. Rather, it subtly highlights their unique characteristics, adding a slight tang that elevates the entire tasting experience.',
    shop: 'Sardines with Lemon',
    b2b: 'Sardines in olive oil with Lemon 1/6 - 115 g', price: 4.40, eshop: 8.80, cat: 'Sardines', old: 'sardines-with-lemon', ref: '510244', ean: '3022655102448', weight: '115 g', format: '1/6', units: 12, paint: '#b9b21a',
  },
  {
    id: 'classic-1926', line: 'Millésime', name: 'Classic 1926', tin: 'Sardines à l’huile d’olive vierge extra',
    lead: 'A 69 g tin, for those who prefer not to share.',
    desc: 'These sardines were discovered in a 1926 catalogue, and we have also recovered the original recipe from that period. The 69 g format was intended primarily for those who prefer not to share their tin.',
    note: 'Select sardines in extra virgin olive oil, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    shop: 'Sardines 69g Classic 1926',
    b2b: 'Sardines in olive oil 1/10 - 69 g', price: 3.30, eshop: 5.90, cat: 'Sardines', old: 'sardines-classic-1926', ref: '510011', ean: '3022655100116', weight: '69 g', format: '1/10', units: 15, paint: '#9e1048', aspect: 1.54,
  },
  {
    id: 'green-pepper', line: 'Recipes of the house', name: 'Poivre Vert', tin: 'Sardines à l’huile d’olive vierge extra au poivre vert',
    lead: 'With green peppercorns.',
    desc: 'Select sardines in extra virgin olive oil with green pepper, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    shop: 'Sardines with Green Pepper',
    b2b: 'Sardines in olive oil and Green Pepper 1/6 - 115 g', price: 4.40, eshop: 8.80, cat: 'Sardines', old: 'sardines-with-green-pepper', ref: '510071', ean: '3022655100710', weight: '115 g', format: '1/6', units: 12, paint: '#6f7d16',
  },
  {
    id: 'spicy-tomato', line: 'Recipes of the house', name: 'Tomate Épicée', tin: 'Sardines à la tomate épicée',
    lead: 'In a spiced tomato sauce.',
    desc: 'Select sardines with spicy tomato, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    shop: 'Sardines with Spicy Tomato',
    b2b: 'Sardines in olive oil with Spicy Tomato 1/6 - 115 g', price: 4.40, eshop: 8.80, cat: 'Sardines', old: 'sardines-with-spicy-tomato', ref: '510265', ean: '3022655102653', weight: '115 g', format: '1/6', units: 12, paint: '#238a24',
  },
  {
    id: 'achards-truffle', line: 'Recipes of the house', name: 'Achards & Truffe', tin: 'Sardines aux achards & à la truffe Tuber brumale 1%',
    lead: 'With achards and Tuber brumale truffle.',
    desc: 'Select sardines in extra virgin olive oil with achards and truffle, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    shop: 'Sardines with Achards and Truffle',
    note: 'Select sardines in extra virgin olive oil, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    b2b: 'Sardines in olive oil, Truffles and Achards 1/6 - 115 g', price: 5.90, eshop: 11.80, cat: 'Sardines', old: 'sardines-with-achards-and-truffle', ref: '510202', ean: '3022655102028', weight: '115 g', format: '1/6', units: 12, paint: '#1679bd',
  },
  {
    id: 'cod-liver', line: 'Specialities', name: 'Foie de Morue Fumé', tin: 'Foie de morue fumé au bois de hêtre',
    lead: 'Cod liver, smoked over beechwood.',
    desc: 'Cod liver smoked over beechwood, from the specialities of the house.',
    shop: 'Smoked Cod Liver',
    b2b: 'Cod Liver smoked over beechwood 121 g', price: 3.60, eshop: 7.20, cat: 'Specialities', old: 'smoked-cod-liver', ref: '512019', ean: '3022655120190', weight: '121 g', format: 'Box', units: 12, paint: '#e7b7a6', box: true,
  },
];

export const TINS = PRODUCTS.filter((p) => !p.box);
export const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const MIN_ORDER = 1000; // euros, from the B2B ordering terms

// One formatter for the whole site; tools/build.py's money() must print the same.
const eur = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
export const money = (n) => eur.format(n);

// lid width ÷ depth, measured from the pack shots (tools/assets.json)
export const aspectOf = (p) => p.aspect ?? 1.275;
