"""Cut the tins out of their cream studio background (transparent WebP).

GrabCut, seeded from the tin's bounding box on the cream ground, then a
slightly feathered edge. Writes img/products/<id>(-600).webp and
img/lids/<id>(-160).webp over the cream versions.

    python3 tools/cutout.py <downloads dir>
"""
import pathlib, sys
import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from import_assets import PACKS, src  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / 'img'


def cut(path):
    """The tins are rounded rectangles seen from above: find the tight box on the
    cream ground (shadow excluded by a firm threshold), measure each corner's
    radius along its diagonal, and cut an anti-aliased rounded rectangle."""
    bgr = cv2.imread(str(path))
    h, w = bgr.shape[:2]
    ground = np.median(np.concatenate([bgr[:20].reshape(-1, 3), bgr[-20:].reshape(-1, 3)]), axis=0)
    f = bgr.astype(float)
    fg = np.linalg.norm(f - ground, axis=2) > 70
    # the cast shadow is a soft warm-orange version of the cream ground: R-B and
    # saturation 30-62, green between in the same proportion. Gold is far more
    # saturated (~100), silver rims are neutral, so neither matches.
    r, g, b = f[..., 2], f[..., 1], f[..., 0]
    sat = f.max(axis=2) - f.min(axis=2)
    rb = np.maximum(r - b, 1)
    shadow = (sat > 28) & (sat < 64) & (r - b >= 28) & ((g - b) / rb > 0.35) & ((g - b) / rb < 0.85) & (f.mean(axis=2) > 80)
    fg = (fg & ~shadow).astype(np.uint8)
    fg = cv2.medianBlur(fg * 255, 9) // 255
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    k = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    x0, y0, bw, bh = stats[k, :4]
    blob = (lab == k)
    radii = []
    for cx, cy, dx, dy in [(x0, y0, 1, 1), (x0 + bw - 1, y0, -1, 1), (x0, y0 + bh - 1, 1, -1), (x0 + bw - 1, y0 + bh - 1, -1, -1)]:
        for i in range(min(bw, bh) // 2):
            if blob[cy + dy * i, cx + dx * i]:
                radii.append(i * 2 ** 0.5 / (2 ** 0.5 - 1)); break
    r = float(np.median(radii)) if radii else 0
    S = 4  # supersampled for a clean edge
    m = np.zeros((bh * S, bw * S), np.uint8)
    R = int(r * S)
    cv2.rectangle(m, (R, 0), (bw * S - 1 - R, bh * S - 1), 255, -1)
    cv2.rectangle(m, (0, R), (bw * S - 1, bh * S - 1 - R), 255, -1)
    for cx, cy in [(R, R), (bw * S - 1 - R, R), (R, bh * S - 1 - R), (bw * S - 1 - R, bh * S - 1 - R)]:
        if R: cv2.circle(m, (cx, cy), R, 255, -1, lineType=cv2.LINE_AA)
    m = cv2.resize(m, (bw, bh), interpolation=cv2.INTER_AREA)
    m = cv2.erode(m, np.ones((3, 3), np.uint8))  # a hair inside, no cream fringe
    rgba = cv2.cvtColor(bgr[y0:y0 + bh, x0:x0 + bw], cv2.COLOR_BGR2RGBA)
    rgba[..., 3] = m
    return Image.fromarray(rgba)


def save(im, path, width, q=86):
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, 'WEBP', quality=q, method=6, exact=True)
    return im.size


if __name__ == '__main__':
    SRC = pathlib.Path(sys.argv[1])
    import import_assets
    import_assets.SRC = SRC
    src = import_assets.src
    for pid, n in PACKS.items():
        im = cut(src(n))
        # catalogue image: the tin centred on a transparent 4:3 field, with room for its shadow
        W = round(im.width * 1.18); H = round(W * 3 / 4)
        if H < im.height * 1.18:
            H = round(im.height * 1.18); W = round(H * 4 / 3)
        field = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        field.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
        save(field, IMG / 'products' / f'{pid}.webp', 1200)
        save(field, IMG / 'products' / f'{pid}-600.webp', 600)
        save(im, IMG / 'lids' / f'{pid}.webp', 1100)
        save(im, IMG / 'lids' / f'{pid}-160.webp', 160)
        print(pid, im.size)
