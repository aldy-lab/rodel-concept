// Products and the lid print drawn for each. Facts only from rodel.fr —
// no weights, prices or claims the current site doesn't make.

export const PRODUCTS = [
  {
    id: 'millesime-2025', no: '01', name: 'Millésime 2025', sub: 'Boneless',
    desc: 'Hand-boned sardines from the finest catch of the year, prepared on the day they are landed.',
    specs: [['Catch', '2025'], ['Preparation', 'Boned by hand'], ['Packed', 'Day of the catch']],
    ground: '#0e1c2b', ink: '#dfe7ee', line: '#7f97ab', paint: '#13263a',
  },
  {
    id: 'classic', no: '02', name: 'Millésime Classic', sub: 'The house reference',
    desc: 'The original benchmark of the house, created by the son of Charles Rödel. Keeps its quality for up to ten years.',
    specs: [['Created by', 'Charles Rödel’s son'], ['Keeps', 'Up to 10 years'], ['Packed', 'By hand, Brittany']],
    ground: '#3f1520', ink: '#e8e9ec', line: '#9b6b74', paint: '#4a1824',
  },
  {
    id: 'chica-pica', no: '03', name: 'Chica Pica', sub: 'Spiced',
    desc: 'A spice blend created in the early twentieth century by a Venezuelan friend of the house. A registered trademark.',
    specs: [['Recipe', 'Early 20th century'], ['Origin', 'A Venezuelan friend'], ['Mark', 'Registered ®']],
    ground: '#17191c', ink: '#dde2e7', line: '#8e3b3b', paint: '#1d2024',
  },
  {
    id: 'citron', no: '04', name: 'Citron', sub: 'Olive oil & lemon',
    desc: 'Sardines in extra virgin olive oil with a whole sun-ripened lemon.',
    specs: [['Oil', 'Extra virgin olive'], ['With', 'Whole lemon'], ['Packed', 'By hand, Brittany']],
    ground: '#e6eaed', ink: '#14253a', line: '#bdb84a', paint: '#d4dadf',
  },
  {
    id: 'classic-1926', no: '05', name: 'Classic 1926', sub: '69 g · single serving',
    desc: 'A single serving made to a 1926 recipe, recovered from an original catalogue of the house.',
    specs: [['Size', '69 g'], ['Recipe', '1926'], ['Source', 'Original catalogue']],
    ground: '#26333f', ink: '#e3e9ee', line: '#8297a8', paint: '#2b3a48',
  },
];

function spaced(ctx, text, x, y, spacing) {
  // canvas letterSpacing isn't everywhere yet; set characters one by one
  const chars = [...text];
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  for (const c of chars) {
    ctx.fillText(c, cx + ctx.measureText(c).width / 2, y);
    cx += ctx.measureText(c).width + spacing;
  }
}

export function drawLabel(canvas, p) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = p.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(70, 70, w - 140, h - 140);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(92, 92, w - 184, h - 184);

  // corner crosshairs
  ctx.lineWidth = 2;
  for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) {
    ctx.beginPath();
    ctx.moveTo(x - 34, y); ctx.lineTo(x + 34, y);
    ctx.moveTo(x, y - 34); ctx.lineTo(x, y + 34);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = p.ink;

  ctx.font = '500 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`N° ${p.no}`, 150, 175);
  ctx.textAlign = 'right';
  ctx.fillText('BRETAGNE', w - 150, 175);
  ctx.textAlign = 'center';

  ctx.font = '300 280px "Cormorant Garamond", serif';
  spaced(ctx, 'RÖDEL', w / 2, h * 0.5, 56);

  ctx.strokeStyle = p.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 300, h * 0.575); ctx.lineTo(w / 2 + 300, h * 0.575);
  ctx.stroke();

  ctx.font = 'italic 300 120px "Cormorant Garamond", serif';
  ctx.fillText(p.name, w / 2, h * 0.7);

  ctx.font = '400 36px "JetBrains Mono", monospace';
  spaced(ctx, "SARDINES À L'HUILE · DEPUIS 1824", w / 2, h * 0.8, 6);

  // a measurement rule along the bottom edge
  ctx.fillStyle = p.line;
  const x0 = 150, x1 = w - 150, yb = h - 128;
  for (let i = 0; i <= 60; i++) {
    const x = x0 + (x1 - x0) * (i / 60);
    const len = i % 10 === 0 ? 26 : i % 5 === 0 ? 16 : 9;
    ctx.fillRect(x - 1, yb - len, 2, len);
  }
}
