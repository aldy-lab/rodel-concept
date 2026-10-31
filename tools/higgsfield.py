"""Animate the seven history-reel photographs with Higgsfield (image to video).

Each archive photograph on the home page's history reel is sent to Higgsfield's
Kling 2.5 Turbo Pro image-to-video model with a restrained, era-specific
prompt: light, air and camera move; the picture itself does not change. The
clips are downloaded, compressed for the web into img/reel/, and recorded in
tools/reel_videos.json, which tools/build.py reads to put them on the page.

Credentials stay on this machine. Set them in the environment:

    export HF_API_KEY_ID=...   HF_API_KEY_SECRET=...

or in ~/.config/higgsfield/credentials (chmod 600), two lines:

    HF_API_KEY_ID=...
    HF_API_KEY_SECRET=...

Run:
    python3 tools/higgsfield.py --dry-run     # show what would be sent, no cost
    python3 tools/higgsfield.py               # generate what is missing
    python3 tools/higgsfield.py --only etel   # one era
    python3 tools/higgsfield.py --redo etel   # pay again for a fresh take

Each request carries an Idempotency-Key derived from slug, model and prompt, so
running it twice does not pay twice; a run that was interrupted resumes
polling the requests it already made.
"""
import argparse, hashlib, json, math, os, pathlib, ssl, subprocess, sys, time, urllib.error, urllib.request, uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = 'https://aldy-lab.github.io/rodel-concept/'   # the inputs are the site's own public images
API = 'https://api.higgsfield.ai'
MODEL = 'kling-video/v2.5-turbo/pro/image-to-video'
STATE = ROOT / 'tools' / 'reel_videos.json'
CACHE = ROOT / 'tools' / '.cache' / 'higgsfield'
OUT = ROOT / 'img' / 'reel'

# Keep every archive true to itself: no new people, objects or text; faces and
# lettering untouched. Motion comes from light, air, water and the camera.
NEGATIVE = ('new objects, new people, people walking, faces changing, morphing, warping, distorted text, '
            'changing letters, extra limbs, cartoon, 3d render, modern elements, colour change, oversaturated, '
            'flicker, fast motion, zoom blur')
# Second takes, after review: a moving camera made the model redraw lettering
# ("RÖDEL" became "RAPRE" on the tin; "PLAGE" became "PLACE") and the medal
# drifted to copper. These eras get a locked-off camera and extra guards.
NEGATIVE_EXTRA = {
    slug: ', new words, rotating object, camera orbit, camera movement, orange tint'
    + (', people moving, standing up, hauling, lifting, hands moving, new net' if slug == 'arcachon-fishermen' else '')
    for slug in ('founders-medal', 'plage-rodel', 'tin-marble-red', 'fishermen', 'cannery-workers', 'canton-road', 'hands-open-tins',
                 'arcachon-fishermen', 'engraving-workshop', 'factory-staff', 'tin-dark')
}
PROMPTS = {
    'napoleon': 'Slow cinematic push-in on this oil painting. Clouds drift slowly across the dusk sky, the sea '
                'shimmers faintly below, the coat stirs in a light wind. The figure keeps its pose. Painterly '
                'brushwork and canvas texture preserved.',
    'founders-medal': 'Locked-off static camera, macro shot of an antique bronze medal on black. The medal does not '
                      'move. Only a soft white studio light glides slowly across the relief, small highlights travel '
                      'over the two profiles. The bronze keeps exactly its original colour; inscription unchanged.',
    'etel': 'Archival black-and-white photograph of a nineteenth-century cannery brought gently to life: a slow '
            'camera drift toward the building, a thin plume of smoke from the roof, soft film grain. The people '
            'stand still for the photograph; faces unchanged.',
    'concarneau': 'Slow aerial drift over this engraved illustration of a Breton cannery by the harbour. Smoke '
                  'rises softly from the chimney, the water ripples, gentle parallax between buildings and boats. '
                  'Fine engraving lines and monochrome tone preserved; the printed caption stays as it is.',
    'emblem-1880': 'Slow push-in on a printed nineteenth-century emblem, a globe with a beehive. A raking light '
                   'passes slowly across the paper and its texture. The design, colours and the year printed on '
                   'it do not change.',
    'plage-rodel': 'Locked-off static camera on an archival black-and-white photograph of a seaside road in '
                   'Concarneau, 1900. No camera movement. Only low waves roll gently onto the shore and the clouds '
                   'drift; the trees sway very slightly. The printed white caption is fixed and identical in every '
                   'frame. Film grain.',
    'tin-marble-red': 'Locked-off static camera, luxury product photograph. A red Rödel sardine tin rests on white '
                      'marble and does not move or rotate. Only soft sunlight and the shadows of leaves drift slowly '
                      'across the tin and the marble. The tin, its shape and every letter of its label stay sharp and '
                      'identical in every frame.',
    # the film's new tableaux: locked camera throughout; faces and hands stay as photographed
    'fishermen': 'Locked-off static camera on an archival black-and-white photograph of a Breton harbour. Only '
                 'the water ripples and glints, the sails and rigging stir softly in the wind, a few gulls drift '
                 'far away. The fishermen keep their poses; faces unchanged. Film grain.',
    'cannery-workers': 'Locked-off static camera on an archival photograph of Breton women preparing sardines '
                       'on racks by the harbour. The women do not move; faces and white coiffes unchanged. Only '
                       'soft daylight shifts across the scene and the sea and masts in the background shimmer '
                       'faintly. Film grain.',
    'canton-road': 'Locked-off static camera on a hand-tinted early photograph of Canton Road in Shanghai. A faint '
                   'warm haze and soft daylight drift along the street, the hanging shop banners sway very slightly. '
                   'The people stay as photographed. Hand-tinted colours and the printed caption unchanged.',
    'hands-open-tins': 'Locked-off static camera, close-up of two hands holding two open tins of sardines in olive '
                       'oil. The hands stay still. Only a soft light glides slowly across the silver skin of the '
                       'sardines and the oil glistens. Natural colours, sharp detail.',
    # the Sardines page journey: one living photograph per principle
    # second take: the first had the men stand up and haul an invented net within a second
    'arcachon-fishermen': 'Locked-off static camera on a sepia postcard photograph of fishermen sitting in a boat. '
                          'Nobody moves: every man, hand and net stays exactly where it is, as in a still photograph. '
                          'Only the open sea in the background swells slowly and glints. The printed caption and the '
                          'white logo are fixed and identical in every frame. Film grain.',
    'engraving-workshop': 'Locked-off static camera on a fine nineteenth-century engraving of a cannery workshop. '
                          'Only soft daylight from the tall windows drifts slowly across the room and the stacked '
                          'tins catch a faint glint. The workers keep their poses. Engraving lines and monochrome '
                          'paper tone preserved.',
    'factory-staff': 'Locked-off static camera on an archival photograph of factory staff standing in front of a '
                     'cannery beside drying racks of sardines. The people stay still; faces unchanged. Only soft '
                     'daylight and a light breeze move across the scene. Film grain.',
    'tin-dark': 'Locked-off static camera, luxury product photograph of a dark Rödel sardine tin on black. The tin '
                'does not move or rotate. Only a slow, thin band of light glides across the rim and lid. '
                'The tin, its shape and every letter of its label stay sharp and identical in every frame.',
}
DURATION = 5
CFG = 0.5
# seconds kept from a clip whose tail drifts (the medal warms to copper and the
# profiles start to change after ~3 s); it then holds its last good frame
TRIM = {'founders-medal': 2.6,
        'tin-dark': 2.5,             # the lid's lettering is redrawn after 2.5 s (FRÈRES became FRÈAKS)
        }
# longer takes: (model duration, slow-down factor), slowed with motion-interpolated
# frames. A 10 s Kling take of the fishermen was rejected: past 5 s the camera
# drifted and the men changed pose. The approved 5 s take, slowed 3x, runs 15 s.
LONG = {'fishermen': (5, 3.0)}

# python.org builds on macOS ship without system certificates; use certifi's
try:
    import certifi
    TLS = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    TLS = ssl.create_default_context()


def credentials():
    kid, sec = os.environ.get('HF_API_KEY_ID'), os.environ.get('HF_API_KEY_SECRET')
    f = pathlib.Path.home() / '.config' / 'higgsfield' / 'credentials'
    if (not kid or not sec) and f.exists():
        for line in f.read_text().splitlines():
            k, _, v = line.partition('=')
            if k.strip() == 'HF_API_KEY_ID': kid = v.strip()
            if k.strip() == 'HF_API_KEY_SECRET': sec = v.strip()
    if not kid or not sec:
        sys.exit('No Higgsfield credentials: set HF_API_KEY_ID and HF_API_KEY_SECRET, or create '
                 '~/.config/higgsfield/credentials (see the top of this file).')
    return f'Key {kid}:{sec}'


def call(method, url, auth, body=None, idem=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None)
    req.add_header('Authorization', auth)
    req.add_header('Accept', 'application/json')
    if body:
        req.add_header('Content-Type', 'application/json')
    if idem:
        req.add_header('Idempotency-Key', idem)
    try:
        with urllib.request.urlopen(req, timeout=60, context=TLS) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:300]
        raise SystemExit(f'{method} {url.replace(API, "")} -> {e.code}: {detail}')


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def compress(src, dst, trim=None, slow=None):
    """H.264, at most 1280px wide, no audio, fast start: small enough to stream on the page."""
    vf = "scale='min(1280,iw)':-2:flags=lanczos"
    vf += f",setpts={slow}*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if slow else ",fps=30"
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', str(src), *(['-t', str(trim)] if trim else []),
                    '-vf', vf, '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(dst)], check=True)


# Clips that keep the photograph and take only its sea from the model: a matte
# (tools/mattes/<slug>.json, polygons in source pixels) lets the clip through
# only where water is, so faces, hands, nets and printing are the original's in
# every frame. The sea is looped with long cross-fades to the given length.
MATTE = {'arcachon-fishermen': 30}


def sea_composite(src, dst, slug, seconds):
    from PIL import Image, ImageDraw, ImageFilter
    m = json.loads((ROOT / 'tools' / 'mattes' / f'{slug}.json').read_text())
    w, h = m['size']
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.polygon([tuple(p) for p in m['sea']], fill=255)
    for k in m['keep']:
        d.polygon([tuple(p) for p in k], fill=0)
    mask = mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(m['feather']))
    matte, still = CACHE / f'{slug}-matte.png', CACHE / f'{slug}-still.png'
    mask.save(matte)
    Image.open(ROOT / 'img' / 'archive' / f'{slug}.webp').convert('RGB').save(still)
    # the sea plays forward, then back: a seamless cycle with no cross-fade ghosts,
    # looped to length, from the take's clean stretch, slowed a little to calm it.
    cycle = CACHE / f'{slug}-cycle.mp4'
    a, b, slow = m['clean'][0], m['clean'][1], m.get('slow', 1)
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-ss', str(a), '-t', str(b - a), '-i', str(src), '-filter_complex',
                    f'[0:v]scale={w}:{h},setpts={slow}*PTS,minterpolate=fps=30:mi_mode=blend,setsar=1,format=yuv420p,split[f][b];[b]reverse[r];[f][r]concat=n=2:v=1[v]',
                    '-map', '[v]', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', str(cycle)], check=True)
    vf = ("[2:v]format=gray[m];[1:v][m]alphamerge[sea];"
          "[0:v]format=yuv420p[bg];[bg][sea]overlay=shortest=1,scale='min(1280,iw)':-2:flags=lanczos,format=yuv420p")
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-loop', '1', '-i', str(still), '-stream_loop', '-1', '-i', str(cycle),
                    '-loop', '1', '-i', str(matte), '-filter_complex', vf, '-t', str(seconds), '-r', '30', '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(dst)], check=True)


def render(raw, dst, slug):
    if slug in MATTE:
        sea_composite(raw, dst, slug, MATTE[slug])
    else:
        compress(raw, dst, TRIM.get(slug), LONG.get(slug, (0, None))[1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--redo', nargs='*', default=[])
    ap.add_argument('--recompress', action='store_true', help='rebuild img/reel/ from the downloaded clips, no API calls')
    a = ap.parse_args()
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    slugs = a.only or list(PROMPTS)
    if a.recompress:
        for slug in slugs:
            rid = state.get(slug, {}).get('request_id', '')
            raw = CACHE / f'{slug}-{rid[:8]}.mp4'
            if raw.exists():
                render(raw, OUT / f'{slug}.mp4', slug)
                state[slug]['kb'] = (OUT / f'{slug}.mp4').stat().st_size // 1024
                print(f'  {slug}: recompressed, {state[slug]["kb"]} KB')
        STATE.write_text(json.dumps(state, indent=1))
        return

    jobs = []
    for slug in slugs:
        prompt = PROMPTS[slug]
        negative = NEGATIVE + NEGATIVE_EXTRA.get(slug, '')
        duration = LONG.get(slug, (DURATION, None))[0]
        digest = hashlib.sha256(f'{MODEL}|{prompt}|{negative}|{duration}|{CFG}'.encode()).hexdigest()[:16]
        have = state.get(slug, {})
        if have.get('mp4') and have.get('digest') == digest and slug not in a.redo and (ROOT / have['mp4']).exists():
            print(f'  {slug}: done ({have["mp4"]})')
            continue
        take = have.get('take', 0) + (1 if slug in a.redo else 0)
        body = {'prompt': prompt, 'negative_prompt': negative, 'image_url': f'{SITE_URL}img/archive/{slug}.webp',
                'duration': duration, 'cfg_scale': CFG}
        idem = str(uuid.uuid5(uuid.NAMESPACE_URL, f'rodel-reel/{slug}/{digest}/{take}'))
        jobs.append((slug, digest, take, body, idem, have))

    if a.dry_run or not jobs:
        for slug, _, take, body, _, _ in jobs:
            print(f'\n{slug} (take {take})\n  POST /{MODEL}\n  image: {body["image_url"]}\n  prompt: {body["prompt"]}')
        print(f'\n{len(jobs)} clip(s) to generate, {DURATION}s each.' + (' Dry run: nothing sent.' if a.dry_run else ''))
        return

    auth = credentials()
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, digest, take, body, idem, have in jobs:
        rid = have.get('request_id') if have.get('digest') == digest and have.get('take', 0) == take else None
        if not rid:
            r = call('POST', f'{API}/{MODEL}', auth, body, idem)
            rid = r['request_id']
            state[slug] = {'request_id': rid, 'digest': digest, 'take': take, 'model': MODEL}
            STATE.write_text(json.dumps(state, indent=1))
            print(f'  {slug}: submitted {rid}')
        delay, waited = 5, 0
        while True:
            r = call('GET', f'{API}/requests/{rid}/status', auth)
            if r['status'] in ('completed', 'failed', 'nsfw', 'canceled'):
                break
            time.sleep(delay); waited += delay; delay = min(delay * 1.5, 30)
            if waited > 1800:
                raise SystemExit(f'{slug}: still {r["status"]} after 30 min; run again later to resume')
        if r['status'] != 'completed':
            print(f'  {slug}: {r["status"]} {r.get("error") or ""}'); continue
        raw = CACHE / f'{slug}-{rid[:8]}.mp4'
        with urllib.request.urlopen(r['video']['url'], timeout=300, context=TLS) as resp:
            raw.write_bytes(resp.read())
        dst = OUT / f'{slug}.mp4'
        render(raw, dst, slug)
        state[slug].update({'mp4': f'img/reel/{slug}.mp4', 'kb': dst.stat().st_size // 1024})
        STATE.write_text(json.dumps(state, indent=1))
        print(f'  {slug}: ready, {dst.stat().st_size // 1024} KB')
    print('Now run: python3 tools/build.py')


if __name__ == '__main__':
    main()
