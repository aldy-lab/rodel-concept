"""Render the phone layout's stills into img/ as WebP.

Serve the repo root (python3 -m http.server 8731) and run: python3 tools/stills.py
"""
import asyncio, io, pathlib
from PIL import Image
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8731/tools/stills.html'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'img'
# the phone cards use the real pack shots; only the scene's own moments are rendered
SHOTS = [('shoal', 'shot=shoal'), ('tin-open', 'shot=open'), ('tin-ajar', 'shot=ajar')]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 900, 'height': 640}, device_scale_factor=2)
        for name, query in SHOTS:
            await pg.goto(f'{BASE}?{query}', wait_until='networkidle')
            await pg.wait_for_function('document.documentElement.dataset.done === "1"', timeout=30000)
            png = await pg.locator('canvas').screenshot(omit_background=True)
            img = Image.open(io.BytesIO(png)).convert('RGBA').resize((1200, 853), Image.LANCZOS)
            img.save(OUT / f'{name}.webp', 'WEBP', quality=82, method=6)
            print(name, (OUT / f'{name}.webp').stat().st_size // 1024, 'KB')
        await b.close()

asyncio.run(main())
