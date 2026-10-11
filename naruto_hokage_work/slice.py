"""naruto_hokage slicer: keyed sheet -> per-action *_uniform.png strips.

Follows the project reslice() contract: measure each frame's content bbox,
repack into uniform cells (max w+2 x max h+2), center-X, bottom-align,
anchorY:0. Auto-detects frame x-spans by column-occupancy gaps within a
y-band; honors explicit xrects / even-split when given; can trim a thin
top label strip. Writes naruto_hokage_<action>_uniform.png to repo root
and prints the animationData geometry line.
"""
import numpy as np
from PIL import Image
import key_tool as k

ALPHA = 8
OUTDIR = '..'   # repo root

_H = None
_V = None
def H():
    global _H
    if _H is None: _H = k.load('H_keyed.png')
    return _H
def V():
    global _V
    if _V is None: _V = k.load('V_keyed.png')
    return _V


def _col_spans(mask, min_gap=2, min_w=3, min_px=4):
    """Return [(x0,x1),...] content spans separated by >=min_gap empty cols."""
    cols = mask.sum(0)
    on = cols >= 1
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


def _trim_top_label(sub):
    """Given a band sub-image (RGBA), drop a thin top text strip if a clear
    horizontal gutter separates it from the (taller) sprite content below."""
    m = sub[..., 3] > ALPHA
    rows = m.sum(1)
    on = rows >= 1
    # find runs of on-rows
    runs = []; s = None
    for y, v in enumerate(on):
        if v and s is None: s = y
        if not v and s is not None: runs.append((s, y)); s = None
    if s is not None: runs.append((s, len(on)))
    if len(runs) >= 2:
        first = runs[0]
        # a label is short (<=14px) and followed by a real gutter
        if first[1] - first[0] <= 14 and runs[1][0] - first[1] >= 2:
            return first[1]
    return 0


def slice_action(sheet, name, y0, y1, xrects=None, neven=None, x0=0, x1=None,
                 trim_label=True, pad=2, flip=False, verbose=True):
    im = sheet
    x1 = im.shape[1] if x1 is None else x1
    band = im[y0:y1, x0:x1, :].copy()
    if trim_label:
        off = _trim_top_label(band)
        if off: band = band[off:, :, :]
    m = band[..., 3] > ALPHA
    if xrects is not None:
        spans = [(a, b) for (a, b) in xrects]
    elif neven is not None:
        w = band.shape[1]; step = w / neven
        spans = [(int(round(i*step)), int(round((i+1)*step))) for i in range(neven)]
    else:
        spans = _col_spans(m)
    # measure each frame's content bbox
    frames = []
    for (a, b) in spans:
        sub = band[:, a:b, :]
        mm = sub[..., 3] > ALPHA
        ys, xs = np.where(mm)
        if len(ys) == 0:
            continue
        fy0, fy1 = ys.min(), ys.max()+1
        fx0, fx1 = xs.min(), xs.max()+1
        frames.append(sub[fy0:fy1, a-a+fx0:a-a+fx1, :])
    if not frames:
        print('!! %s: no frames' % name); return None
    uW = max(f.shape[1] for f in frames) + pad
    uH = max(f.shape[0] for f in frames) + pad
    strip = np.zeros((uH, uW*len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        fh, fw = f.shape[:2]
        dx = i*uW + (uW-fw)//2
        dy = uH - fh - 1
        strip[dy:dy+fh, dx:dx+fw, :] = f
    if flip:
        # flip each cell horizontally (native faces wrong way)
        cells = [np.fliplr(strip[:, i*uW:(i+1)*uW, :]) for i in range(len(frames))]
        strip = np.concatenate(cells, 1)
    out = '%s/naruto_hokage_%s_uniform.png' % (OUTDIR, name)
    Image.fromarray(strip).save(out)
    if verbose:
        print('OK %-26s %2df  cell %dx%d  -> { frames: %d, width: %d, height: %d, anchorY: 0 }'
              % (name, len(frames), uW, uH, len(frames), uW, uH))
    return len(frames), uW, uH
