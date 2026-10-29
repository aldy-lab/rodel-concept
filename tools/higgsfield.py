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
import argparse, hashlib, json, os, pathlib, ssl, subprocess, sys, time, urllib.error, urllib.request, uuid

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
    for slug in ('founders-medal', 'plage-rodel', 'tin-marble-red')
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
}
DURATION = 5
CFG = 0.5
# seconds kept from a clip whose tail drifts (the medal warms to copper and the
# profiles start to change after ~3 s); it then holds its last good frame
TRIM = {'founders-medal': 2.6}

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


def compress(src, dst, trim=None):
    """H.264, at most 1280px wide, no audio, fast start: small enough to stream on the page."""
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', str(src), *(['-t', str(trim)] if trim else []),
                    '-vf', "scale='min(1280,iw)':-2:flags=lanczos,fps=30", '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(dst)], check=True)


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
                compress(raw, OUT / f'{slug}.mp4', TRIM.get(slug))
                state[slug]['kb'] = (OUT / f'{slug}.mp4').stat().st_size // 1024
                print(f'  {slug}: recompressed, {state[slug]["kb"]} KB')
        STATE.write_text(json.dumps(state, indent=1))
        return

    jobs = []
    for slug in slugs:
        prompt = PROMPTS[slug]
        negative = NEGATIVE + NEGATIVE_EXTRA.get(slug, '')
        digest = hashlib.sha256(f'{MODEL}|{prompt}|{negative}|{DURATION}|{CFG}'.encode()).hexdigest()[:16]
        have = state.get(slug, {})
        if have.get('mp4') and have.get('digest') == digest and slug not in a.redo and (ROOT / have['mp4']).exists():
            print(f'  {slug}: done ({have["mp4"]})')
            continue
        take = have.get('take', 0) + (1 if slug in a.redo else 0)
        body = {'prompt': prompt, 'negative_prompt': negative, 'image_url': f'{SITE_URL}img/archive/{slug}.webp',
                'duration': DURATION, 'cfg_scale': CFG}
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
        compress(raw, dst, TRIM.get(slug))
        state[slug].update({'mp4': f'img/reel/{slug}.mp4', 'kb': dst.stat().st_size // 1024})
        STATE.write_text(json.dumps(state, indent=1))
        print(f'  {slug}: ready, {dst.stat().st_size // 1024} KB')
    print('Now run: python3 tools/build.py')


if __name__ == '__main__':
    main()
