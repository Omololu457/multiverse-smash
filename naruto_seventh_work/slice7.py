"""naruto_seventh slicer — keyed padakun H sheet -> per-action *_uniform.png.

Built on the proven naruto_hokage reslice contract (measure each frame's
content bbox, repack into uniform cells max(w)+pad x max(h)+pad, center-X,
bottom-align, anchorY:0). Adds MULTI-ROW support (yrects) so stacked combo
strings pack into one strip, and explicit x-windows to isolate frames that
share a y-row (stance|dash, jump|guard, throw|throw_air, body|FX).

Every output is namespaced naruto_seventh_*  (never touches naruto_hokage_*).
Emits a magenta QA composite per action for frame-by-frame verification and
prints the animationData geometry line.
"""
import numpy as np
from PIL import Image
import key_tool as k

ALPHA = 8
OUT = '..'            # repo root
QA = 'qa'            # QA dir (under work/)
import os
os.makedirs(QA, exist_ok=True)

_H = None
def H():
    global _H
    if _H is None: _H = k.load('H_keyed.png')
    return _H


def _col_spans(mask, min_gap=2, min_w=3, min_px=4):
    cols = mask.sum(0); on = cols >= 1
    spans = []; s = None; gap = 0
    for x, v in enumerate(on):
        if v:
            if s is None: s = x
            gap = 0
        else:
            if s is not None:
                gap += 1
                if gap >= min_gap:
                    e = x - gap + 1
                    if e - s >= min_w and mask[:, s:e].sum() >= min_px:
                        spans.append((s, e))
                    s = None; gap = 0
    if s is not None:
        e = len(on)
        if e - s >= min_w and mask[:, s:e].sum() >= min_px:
            spans.append((s, e))
    return spans


def _strip_thin_lines(band):
    """Zero out bracket loop-markers / underlines: connected components that are
    very thin-and-wide (h<=4 and w>=16). Honors the TRAP 'bracket lines mark
    loops; exclude them'. Sprites are never that flat."""
    from scipy import ndimage
    m = band[..., 3] > ALPHA
    lbl, n = ndimage.label(m)
    out = band.copy()
    for i in range(1, n+1):
        ys, xs = np.where(lbl == i)
        h = ys.max()-ys.min()+1; w = xs.max()-xs.min()+1
        if h <= 4 and w >= 16:
            out[ys, xs, 3] = 0
    return out


def _skip_top_label(band):
    """If the TOP content row-run is a short (<=16px) strip, it's a label — crop
    below it. Sprites are always taller, so this never eats a body frame."""
    m = band[..., 3] > ALPHA
    rows = m.sum(1); on = rows >= 1
    runs = []; s = None
    for y, v in enumerate(on):
        if v and s is None: s = y
        if not v and s is not None: runs.append((s, y)); s = None
    if s is not None: runs.append((s, len(on)))
    if runs and (runs[0][1]-runs[0][0]) <= 16 and len(runs) >= 2:
        return band[runs[1][0]:, :, :]
    return band


def _frames_from_band(band, xrects=None, neven=None, min_gap=2, min_w=3, min_px=4):
    m = band[..., 3] > ALPHA
    if xrects is not None:
        spans = list(xrects)
    elif neven is not None:
        w = band.shape[1]; step = w / neven
        spans = [(int(round(i*step)), int(round((i+1)*step))) for i in range(neven)]
    else:
        spans = _col_spans(m, min_gap, min_w, min_px)
    frames = []
    for (a, b) in spans:
        sub = band[:, a:b, :]
        mm = sub[..., 3] > ALPHA
        ys, xs = np.where(mm)
        if len(ys) == 0:
            continue
        frames.append(sub[ys.min():ys.max()+1, xs.min():xs.max()+1, :])
    return frames


def slice_action(name, ybands, x0=0, x1=None, xrects=None, neven=None,
                 pad=2, flip=False, min_gap=2, min_w=3, min_px=4,
                 strip_lines=False, skip_label=False, verbose=True):
    """ybands: (y0,y1) or list of (y0,y1) stacked rows. Frames concatenated in
    row-major order. x0/x1 window the sheet; xrects/neven override x detection.
    strip_lines removes bracket/underline markers; skip_label drops a top label."""
    im = H()
    x1 = im.shape[1] if x1 is None else x1
    if isinstance(ybands[0], int):
        ybands = [ybands]
    frames = []
    for (y0, y1) in ybands:
        band = im[y0:y1, x0:x1, :].copy()
        if strip_lines: band = _strip_thin_lines(band)
        if skip_label:  band = _skip_top_label(band)
        frames += _frames_from_band(band, xrects, neven, min_gap, min_w, min_px)
    if not frames:
        print('!! %-26s NO FRAMES' % name); return None
    uW = max(f.shape[1] for f in frames) + pad
    uH = max(f.shape[0] for f in frames) + pad
    strip = np.zeros((uH, uW*len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        fh, fw = f.shape[:2]
        dx = i*uW + (uW-fw)//2
        dy = uH - fh - 1
        strip[dy:dy+fh, dx:dx+fw, :] = f
    if flip:
        cells = [np.fliplr(strip[:, i*uW:(i+1)*uW, :]) for i in range(len(frames))]
        strip = np.concatenate(cells, 1)
    Image.fromarray(strip).save('%s/naruto_seventh_%s_uniform.png' % (OUT, name))
    # magenta QA
    Image.fromarray(k.composite(strip, (255, 0, 255))).save('%s/%s.png' % (QA, name))
    if verbose:
        print('OK %-24s %2df  cell %dx%d  { frames: %d, width: %d, height: %d, anchorY: 0 }'
              % (name, len(frames), uW, uH, len(frames), uW, uH))
    return len(frames), uW, uH


# ─────────────────────────── PHASE 1 action table (native y from keyed scan) ───────────────────────────
if __name__ == '__main__':
    import json
    geo = {}
    def rec(r):
        if r: geo[r_name[0]] = list(r)
    # helper to capture name
    def do(name, *a, **kw):
        r = slice_action(name, *a, **kw)
        if r: geo[name] = list(r)

    # BASE BODY
    do('idle',        (440, 535), x0=0,   x1=420, skip_label=True)   # Stance 8f
    do('dash',        (440, 535), x0=420, x1=632)                    # Dash 3f
    do('run',         (585, 642), x0=0,   x1=352)                    # Run 6f
    do('jump',        (690, 760), x0=0,   x1=366)                    # Jump 5f
    do('guard',       (690, 760), x0=366, x1=460)                    # Guard 2f
    do('hurt',        (810, 882), x0=0,   x1=415)                    # Damage row1 (hit reactions)
    do('getup',       (884, 934), x0=0,   x1=225)                    # Damage row2 (knockdown/getup)
    do('light',       [(985,1048),(1055,1120),(1121,1196)], x0=0, x1=312)   # Combo 1  (3 strings, 9f)
    do('charge',      (1512, 1576), x0=0, x1=210)                    # Chakra Charge 4f
    do('throw',       (1628, 1694), x0=0,   x1=238)                  # Throw Weapon 3f
    do('throw_air',   (1628, 1694), x0=240, x1=448)                  # Throw Weapon (air) 3f
    do('heavy',       (1744, 1806), x0=0, x1=320)                    # Strong Attack 5f
    do('strong_fwd',  (1848, 1912), x0=0, x1=255)                    # Forward 4f
    do('strong_down', (1958, 2046), x0=0, x1=425)                    # Down 6f (RED FLAME)
    do('up',          (2094, 2176), x0=0, x1=390)                    # Up 6f (RED FLAME)
    do('air',         (2222, 2298), x0=0, x1=300)                    # Strong Attack Air 5f
    do('intro',       (342, 416),  x0=0, x1=196)                     # Intro 4f
    do('win',         (4270, 4373), x0=0, x1=96)                     # Win frame 1 (base pose only)

    # BASE SPECIAL bodies (Rasengan/Rasenshuriken balls are code-drawn per ART RULE 3)
    do('doton',       (2320, 2410), x0=0,   x1=300, skip_label=True)             # Doton body 4f
    do('doton_pillar',(2320, 2410), x0=372, x1=742, skip_label=True, neven=6)    # Doton rising-pillar FX 6f
    do('rasengan',    (2452, 2520), x0=0,   x1=315, strip_lines=True)            # Rasengan ground 5f
    do('rasengan_air',(2452, 2520), x0=340, x1=660, strip_lines=True)            # Rasengan air (diving) 5f
    do('rsk',         (2570, 2638), x0=0,   x1=315, strip_lines=True)            # Rasenshuriken ground 5f
    do('rsk_air',     (2570, 2638), x0=340, x1=660, strip_lines=True)            # Rasenshuriken air 5f

    # GAMABUNTA ultimate
    do('kuchiyose',   (3944, 4036), x0=0, x1=400)                    # Kuchiyose seal 5f (+ seal FX)
    do('gamabunta',   (4062, 4238), x0=0, x1=1110)                   # Gamabunta 4 large frames

    json.dump(geo, open('phase1_geo.json', 'w'), indent=0)
    print('\n--- phase1_geo.json written: %d actions ---' % len(geo))
