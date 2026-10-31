"""Draw the fishing-grounds chart for the Sardines page: img/waters.svg.

The coastline is OpenStreetMap's (natural=coastline, © OpenStreetMap
contributors, ODbL), fetched once from Overpass and saved; this script
simplifies it, projects it and writes a hairline chart in the style of the
site: frame ticks in real minutes of latitude and longitude, a 5 km scale bar,
and the three places rodel.fr names (Bay of Concarneau, Glénan, Trévignon).
build.py inlines the SVG, so its labels take the page's fonts and colours.

    curl -A rodel-chart https://overpass-api.de/api/interpreter --data-urlencode \\
      'data=[out:json];way["natural"="coastline"](47.62,-4.20,47.95,-3.65);out geom;' -o coast.json
    python3 tools/chart.py coast.json
"""
import json, math, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
S, N, W, E = 47.695, 47.900, -4.12, -3.745
K = 4400                       # px per degree of latitude
COS = math.cos(math.radians((S + N) / 2))
VW, VH = round((E - W) * COS * K), round((N - S) * K)


def xy(lat, lon):
    return ((lon - W) * COS * K, (N - lat) * K)


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, -1
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            i, dmax = k, d
    if dmax <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)


def main(src):
    ways = json.loads(pathlib.Path(src).read_text())['elements']
    paths = []
    for w in ways:
        pts = [xy(g['lat'], g['lon']) for g in w['geometry']]
        if all(x < -40 or x > VW + 40 or y < -40 or y > VH + 40 for x, y in pts):
            continue
        closed = w['geometry'][0] == w['geometry'][-1]
        pts = rdp(pts, 0.7)
        if len(pts) < 2 or (closed and len(pts) < 4):
            continue
        d = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ('Z' if closed else '')
        paths.append(f'<path class="{"isle" if closed else "coast"}" d="{d}"/>')

    # frame ticks every minute, labelled every five
    ticks = []
    lat = math.ceil(S * 60) / 60
    while lat < N:
        y = xy(lat, W)[1]
        m = round(lat * 60) % 60
        major = m % 5 == 0
        ticks.append(f'<path class="tick" d="M0 {y:.1f}h{12 if major else 6}M{VW} {y:.1f}h-{12 if major else 6}"/>')
        if major:
            ticks.append(f'<text class="deg" x="18" y="{y + 5:.1f}">{int(lat)}°{m:02d}′N</text>')
        lat += 1 / 60
    lon = math.ceil(W * 60) / 60
    while lon < E:
        x = xy(N, lon)[0]
        m = round(abs(lon) * 60) % 60
        major = m % 5 == 0
        ticks.append(f'<path class="tick" d="M{x:.1f} 0v{12 if major else 6}M{x:.1f} {VH}v-{12 if major else 6}"/>')
        if major and 40 < x < VW - 40:
            ticks.append(f'<text class="deg" x="{x:.1f}" y="{VH - 20}" text-anchor="middle">{int(abs(lon))}°{m:02d}′W</text>')
        lon += 1 / 60

    # 5 km scale bar: one degree of latitude is 111.2 km
    km = K / 111.2
    sx, sy = VW - 40 - 5 * km, VH - 56
    scale = (f'<g class="scale"><path d="M{sx:.1f} {sy}h{5 * km:.1f}M{sx:.1f} {sy - 5}v10M{sx + 5 * km:.1f} {sy - 5}v10'
             f'M{sx + 2.5 * km:.1f} {sy - 3}v6"/><text class="deg" x="{sx + 2.5 * km:.1f}" y="{sy - 14}" text-anchor="middle">5 km</text></g>')

    def place(lat, lon, name, sub, dx=14, dy=0, anchor='start', ring=False):
        x, y = xy(lat, lon)
        mark = (f'<circle class="ring" cx="{x:.1f}" cy="{y:.1f}" r="46"/>' if ring else '') + \
               f'<path class="cross" d="M{x - 7:.1f} {y:.1f}h14M{x:.1f} {y - 7:.1f}v14"/>'
        tx, ty = x + dx, y + dy
        return (f'<g class="place">{mark}<text class="name" x="{tx:.1f}" y="{ty - 6:.1f}" text-anchor="{anchor}">{name}</text>'
                f'<text class="deg" x="{tx:.1f}" y="{ty + 20:.1f}" text-anchor="{anchor}">{sub}</text></g>')

    def dms(lat, lon):
        return f'{int(lat)}°{(lat % 1) * 60:04.1f}′N · {int(abs(lon))}°{(abs(lon) % 1) * 60:04.1f}′W'

    places = [
        place(47.8730, -3.9190, 'Concarneau', dms(47.8730, -3.9190), dx=-20, dy=-14, anchor='end'),
        place(47.7930, -3.8550, 'Trévignon', dms(47.7930, -3.8550), dy=44),
        place(47.7210, -3.9990, 'Glénan', dms(47.7210, -3.9990), dx=58, ring=True),
    ]
    # the run from the cannery's harbour out to the archipelago, measured on the chart
    (ax, ay), (gx, gy) = xy(47.8730, -3.9190), xy(47.7210, -3.9990)
    dist = math.hypot(gx - ax, gy - ay) / (K / 111.2)
    ux, uy = (gx - ax) / math.hypot(gx - ax, gy - ay), (gy - ay) / math.hypot(gx - ax, gy - ay)
    mx, my = (ax + gx) / 2, (ay + gy) / 2
    ang = math.degrees(math.atan2(gy - ay, gx - ax)) + 180
    run = (f'<g class="run"><path d="M{ax + ux * 14:.1f} {ay + uy * 14:.1f}L{gx - ux * 50:.1f} {gy - uy * 50:.1f}"/>'
           f'<text class="deg" transform="translate({mx - uy * 14:.1f} {my + ux * 14:.1f}) rotate({ang:.1f})" text-anchor="middle">{dist:.0f} km</text></g>')
    bx, by = xy(47.822, -4.045)
    bay = f'<text class="water" x="{bx:.1f}" y="{by:.1f}" text-anchor="middle">Baie de Concarneau</text>'
    nx, ny = 46, 64
    north = f'<g class="north"><path d="M{nx} {ny + 30}V{ny - 14}M{nx - 6} {ny - 4}l6 -10 6 10"/><text class="deg" x="{nx}" y="{ny + 48}" text-anchor="middle">N</text></g>'

    svg = (f'<svg class="chart" viewBox="0 0 {VW} {VH}" role="img" aria-labelledby="chart-t">'
           f'<title id="chart-t">Chart: the Bay of Concarneau, the Glénan archipelago and Cape Trévignon, South Brittany</title>'
           f'<rect class="edge" x="0.5" y="0.5" width="{VW - 1}" height="{VH - 1}"/>'
           f'<g class="land">{"".join(paths)}</g>{"".join(ticks)}{bay}{run}{"".join(places)}{scale}{north}'
           f'<text class="credit" x="{VW - 14}" y="24" text-anchor="end">© OpenStreetMap contributors</text></svg>')
    out = ROOT / 'img' / 'waters.svg'
    out.write_text(svg)
    print(f'{out.relative_to(ROOT)}: {len(paths)} paths, {len(svg) // 1024} KB, {VW}x{VH}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'coast.json')
