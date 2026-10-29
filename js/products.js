// The Rödel collection, from rodel.fr: product copy from the home and e-shop
// pages, trade data (ref, EAN, weight, case) from the B2B order form, and the
// wording printed on each tin. B2B prices are deliberately not published here.

export const PRODUCTS = [
  {
    id: 'millesime', line: 'Millésime', name: 'Millésime 2025', tin: 'Sardines à l’huile d’olive vierge extra · Millésime 2025',
    lead: 'The cornerstone of the art of preservation.',
    desc: 'This product formed the very cornerstone of the art of preservation and served as the benchmark for all other canneries. Created by Charles Rödel’s son, it followed a precise and unmistakable method, ensuring a taste and quality that may be preserved, and savoured, even after ten years.',
    note: 'Rödel vintage sardines balance the savoury flavour of high-quality fish with the subtlety of premium olive oil, carrying whispers of the pristine waters they come from.',
    b2b: 'Sardines in olive oil 1/6 - 115 g Millésimées', ref: '510017', ean: '3022655100178', weight: '115 g', format: '1/6', units: 12, paint: '#b3121a',
  },
  {
    id: 'millesime-boneless', line: 'Millésime', name: 'Millésime Boneless', tin: 'Sardines sans arêtes à l’huile d’olive vierge extra',
    lead: 'Hand-boned, as once prepared for the royal court.',
    desc: 'The finest sardines of each vintage are prepared without delay, on the very day of their catch. Hand-boned sardines were conceived for the royal court, where it was deemed unthinkable that even the most delicate bone might trouble the noble throats of its distinguished guests.',
    note: 'Select sardines in extra virgin olive oil, hand-cleaned and delicately packed by hand.',
    b2b: 'Sardines without bones in olive oil 1/6 - 115 g Millésimées', ref: '510021', ean: '3022655100215', weight: '115 g', format: '1/6', units: 12, paint: '#121212',
  },
  {
    id: 'chica-pica', line: 'Recipes of the house', name: 'Chica Pica', tin: 'Sardines Chica Pica à l’huile d’olive vierge extra & aux aromates',
    lead: 'A secret spice blend, and a registered trademark of the house.',
    desc: 'Chica Pica, “wild girl”: a secret spice blend created for Rödel in the early twentieth century by a Venezuelan friend. A registered trademark and an enduring culinary signature of the house.',
    note: 'Carrot, pickle, chilli, white pepper, clove and laurel give a rich, full flavour with a slightly salty, smoky depth.',
    b2b: 'Sardines with Chica Pica aromas 1/6 - 115 g', ref: '510223', ean: '3022655102233', weight: '115 g', format: '1/6', units: 12, paint: '#1b3c9e',
  },
  {
    id: 'citron', line: 'Recipes of the house', name: 'Citron', tin: 'Sardines à l’huile d’olive vierge extra au citron',
    lead: 'Extra virgin olive oil and a whole sun-ripened lemon.',
    desc: 'Fish and lemon form a classic harmony, like love and marriage in a timeless jazz refrain. With extra virgin olive oil and a whole sun-ripened lemon, a combination that has lasted for centuries.',
    note: 'An immediate burst of fresh sardine, mellowed by the oil; the lemon never competes, it lifts.',
    b2b: 'Sardines in olive oil with Lemon 1/6 - 115 g', ref: '510244', ean: '3022655102448', weight: '115 g', format: '1/6', units: 12, paint: '#b9b21a',
  },
  {
    id: 'classic-1926', line: 'Millésime', name: 'Classic 1926', tin: 'Sardines à l’huile d’olive vierge extra',
    lead: 'A 69 g tin, for those who prefer not to share.',
    desc: 'These sardines were discovered in a 1926 catalogue, and the original recipe of the period was recovered with them. The 69 g format was intended primarily for those who prefer not to share their tin.',
    note: 'Select sardines in extra virgin olive oil, prepared only from fresh fish on the very day of the catch.',
    b2b: 'Sardines in olive oil 1/10 - 69 g', ref: '510011', ean: '3022655100116', weight: '69 g', format: '1/10', units: 15, paint: '#9e1048', aspect: 1.54,
  },
  {
    id: 'green-pepper', line: 'Recipes of the house', name: 'Poivre Vert', tin: 'Sardines à l’huile d’olive vierge extra au poivre vert',
    lead: 'With green peppercorns.',
    desc: 'Select sardines in extra virgin olive oil with green pepper, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    b2b: 'Sardines in olive oil and Green Pepper 1/6 - 115 g', ref: '510071', ean: '3022655100710', weight: '115 g', format: '1/6', units: 12, paint: '#6f7d16',
  },
  {
    id: 'spicy-tomato', line: 'Recipes of the house', name: 'Tomate Épicée', tin: 'Sardines à la tomate épicée',
    lead: 'In a spiced tomato sauce.',
    desc: 'Select sardines with spicy tomato, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    b2b: 'Sardines in olive oil with Spicy Tomato 1/6 - 115 g', ref: '510265', ean: '3022655102653', weight: '115 g', format: '1/6', units: 12, paint: '#238a24',
  },
  {
    id: 'achards-truffle', line: 'Recipes of the house', name: 'Achards & Truffe', tin: 'Sardines aux achards & à la truffe Tuber brumale 1%',
    lead: 'With achards and Tuber brumale truffle.',
    desc: 'Select sardines in extra virgin olive oil with achards and truffle, hand-cleaned and delicately packed by hand. Prepared only from fresh fish on the very day of the catch, sourced exclusively from the Brittany coast.',
    b2b: 'Sardines in olive oil, Truffles and Achards 1/6 - 115 g', ref: '510202', ean: '3022655102028', weight: '115 g', format: '1/6', units: 12, paint: '#1679bd',
  },
  {
    id: 'cod-liver', line: 'Specialities', name: 'Foie de Morue Fumé', tin: 'Foie de morue fumé au bois de hêtre',
    lead: 'Cod liver, smoked over beechwood.',
    desc: 'Cod liver smoked over beechwood, from the specialities of the house.',
    b2b: 'Cod Liver smoked over beechwood 121 g', ref: '512019', ean: '3022655120190', weight: '121 g', format: 'Box', units: 12, paint: '#e7b7a6', box: true,
  },
];

export const TINS = PRODUCTS.filter((p) => !p.box);

// lid width ÷ depth, measured from the pack shots (tools/assets.json)
export const aspectOf = (p) => p.aspect ?? 1.275;
