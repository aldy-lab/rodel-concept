"""Import rodel.fr's photographs into img/ as WebP, from a folder of downloads.

The downloads are numbered in crawl order (NNN_<original name>). The manifest
below decides what is used and where. Anything not listed is left out on
purpose; EXCLUDED says why, so it can be revisited with the client.

    python3 tools/import_assets.py <downloads dir>
"""
import json, pathlib, sys
from PIL import Image, ImageChops, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = None
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / 'img'

# n: (slug, alt, caption or None)
ARCHIVE = {
    9:  ('fishermen', 'Fishermen at work on the quay, archive photograph', None),
    26: ('napoleon', 'Napoleon Bonaparte, painting by Benjamin Robert Haydon', 'Napoleon Bonaparte, by Benjamin Robert Haydon'),
    29: ('founders-medal', 'Bronze medal with the profiles of the founders', 'The only portrait of the founders'),
    30: ('plage-rodel', 'Plage Rödel in Concarneau, photograph from 1900', 'Plage Rödel, Concarneau, 1900'),
    32: ('emblem-1880', 'The Rödel emblem: a globe paired with a beehive', 'The globe and the beehive, conceived around 1880'),
    35: ('arcachon-fishermen', 'Fishermen at Arcachon, on an early postcard', 'Arcachon, fishermen'),
    37: ('cannery-workers', 'Women preparing sardines in a cannery, archive photograph', None),
    41: ('hands-open-tins', 'Two open tins of Rödel sardines held in two hands', None),
    42: ('arcachon-postcard', 'Postcard of the Rödel factory at Arcachon', 'Arcachon, the Rödel factory'),
    43: ('qualites-book', 'The book Qualités, objets d’en France', None),
    49: ('engraving-workshop', 'Engraving of a cannery workshop', None),
    50: ('early-tins', 'Early preserving tins', None),
    51: ('etel', 'The Rödel factory at Étel', 'Étel'),
    53: ('factory-staff', 'Factory staff photographed in front of a Rödel works', None),
    54: ('quiberon-port-maria', 'Postcard of the Rödel works at Port-Maria, Quiberon', 'Port-Maria, Quiberon'),
    55: ('quiberon', 'Engraving of the Rödel factory at Quiberon', 'Quiberon'),
    56: ('concarneau', 'Engraving of the Rödel factory at Concarneau', 'Concarneau'),
    57: ('arcachon', 'Engraving of the Rödel factory at Arcachon', 'Arcachon'),
    58: ('bourre', 'Engraving of the Rödel factory at Bourré', 'Bourré (Loir-et-Cher)'),
    59: ('sardine-tin-old', 'An early Rödel sardine tin', None),
    61: ('foie-gras-tin', 'A Rödel tin of truffled foie gras pâté', None),
    62: ('medals', 'Rödel & Fils Frères, Bordeaux: a board of exhibition medals', None),
    63: ('petits-pois', 'Rödel tins of petits pois', None),
    64: ('catalogue-page', 'A page from a Rödel catalogue', None),
    65: ('catalogue-asparagus', 'Catalogue illustration of Rödel asparagus tins', None),
    67: ('mackerel-tin', 'A Rödel tin of mackerel fillets', None),
    68: ('tuna-tin', 'A Rödel tin of tuna in oil', None),
    69: ('tuna-blanc', 'A Rödel tin of white tuna', None),
    71: ('sign', 'A Rödel sign: la grande marque française', None),
    72: ('canton-road', 'Canton Road, Shanghai, archive photograph', 'Canton Road, Shanghai'),
    73: ('shanghai-advert', 'Rödel advertisement for its agents in China, Baboud Mary & Cie, Shanghai', 'Sole agents for China: Baboud Mary & Cie, Shanghai'),
    74: ('label', 'A printed Rödel label', None),
    76: ('share-certificate', 'A Rödel & Fils Frères share certificate of five hundred francs', 'A share of five hundred francs'),
    77: ('marques-aquitaine', 'The book Les marques d’Aquitaine', None),
    79: ('pedro-ii', 'Pedro II, Emperor of Brazil, photograph from 1865', 'Pedro II, Emperor of Brazil, 1865'),
    81: ('jacques-gonidec', 'Jacques Gonidec, head of Conserverie Gonidec', 'Jacques Gonidec, Conserverie Gonidec'),
    84: ('tin-marble-red', 'A Rödel sardine tin on marble', None),
    85: ('tin-marble-black', 'A Rödel sardine tin on marble', None),
    86: ('tin-marble-chica', 'A Rödel Chica Pica tin on marble', None),
    91: ('hanoi-advert', 'Advertisement from Hanoi listing Rödel preserves', None),
    93: ('tin-stack', 'A stack of black Rödel sardine tins', None),
    27: ('tin-dark', 'A Rödel tin in low light', None),
}
BRAND = {3: 'emblem-white', 33: 'emblem-line', 2: 'monogram-white'}
# product id -> pack shot number (cream background, shot from above)
PACKS = {
    'millesime-boneless': 98, 'millesime': 99, 'chica-pica': 100, 'citron': 101,
    'spicy-tomato': 102, 'green-pepper': 103, 'classic-1926': 104,
    'achards-truffle': 105, 'cod-liver': 106,
}
EXCLUDED = {
    'stockist shop photos (10–24)': 'photographs of other businesses; the site lists stockists by name',
    'stock photography (25, 36, 38, 39, 40, 96)': 'not Rödel’s; licence unknown',
    'AI-generated images (28, 34, 60, 66)': 'filenames show Midjourney/ChatGPT output, including the Fortnum & Mason tin (34); a heritage page must not pass these off as archive',
    'certification badges (45 Eco Friendly, 46 MSC, 47 Produit en Bretagne)': 'need proof of certification/licence before use',
    'collage slides with overlaid text (75, 87–90, 92, 94, 95)': 'designed as slides, not photographs',
    'unidentified portraits (48, 82)': 'need a name and permission',
    'low resolution (70, 80 Philippe Hass at 320 px)': 'too small; ask for originals',
    'duplicates (1, 31, 44, 52, 78, 97)': 'same image as another, a favicon or a placeholder',
}

def src(n):
    return next(SRC.glob(f'{n:03d}_*'))

def save(im, path, width, q=80):
    im = im.copy()
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, 'WEBP', quality=q, method=6)
    return im.size

def tin_box(im):
    """Bounding box of the tin on its cream ground, without the soft shadow."""
    bg = Image.new('RGB', im.size, im.getpixel((20, 20)))
    mask = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 70 else 0)
    return mask.filter(ImageFilter.MedianFilter(9)).getbbox()

def main():
    meta = {'archive': {}, 'products': {}}
    for n, (slug, alt, cap) in ARCHIVE.items():
        im = ImageOps.exif_transpose(Image.open(src(n)))
        if im.mode in ('RGBA', 'LA', 'P'):
            # cut-outs: flatten onto the page ground, or the transparent pixels turn to noise
            im = im.convert('RGBA')
            ground = Image.new('RGBA', im.size, (11, 22, 33, 255))
            ground.alpha_composite(im)
            im = ground
        im = im.convert('RGB')
        w, h = save(im, IMG / 'archive' / f'{slug}.webp', 1600)
        save(im, IMG / 'archive' / f'{slug}-800.webp', 800)
        meta['archive'][slug] = {'alt': alt, 'caption': cap, 'w': w, 'h': h}
    for n, slug in BRAND.items():
        im = Image.open(src(n)).convert('RGBA')
        im.thumbnail((1000, 1000))
        im.save(IMG / 'brand' / f'{slug}.webp', 'WEBP', quality=90, method=6)
    for pid, n in PACKS.items():
        im = Image.open(src(n)).convert('RGB')
        l, t, r, b = tin_box(im)
        # catalogue photograph: the tin on its cream ground, with even margin
        pad = round((r - l) * 0.12)
        cx, cy = (l + r) / 2, (t + b) / 2
        half_w = (r - l) / 2 + pad
        half_h = half_w * 3 / 4
        photo = im.crop((round(cx - half_w), round(cy - half_h), round(cx + half_w), round(cy + half_h)))
        save(photo, IMG / 'products' / f'{pid}.webp', 1200, 82)
        save(photo, IMG / 'products' / f'{pid}-600.webp', 600, 80)
        # lid texture for the 3D tin: the tin top only, a hair inside its edge
        inset = round((r - l) * 0.004)
        lid = im.crop((l + inset, t + inset, r - inset, b - inset))
        save(lid, IMG / 'lids' / f'{pid}.webp', 1100, 80)
        meta['products'][pid] = {'aspect': round((r - l) / (b - t), 4)}
        print(pid, 'lid aspect', meta['products'][pid]['aspect'])
    (ROOT / 'tools' / 'assets.json').write_text(json.dumps({**meta, 'excluded': EXCLUDED}, ensure_ascii=False, indent=1))
    print('archive', len(ARCHIVE), 'brand', len(BRAND), 'products', len(PACKS))


if __name__ == '__main__':
    main()
