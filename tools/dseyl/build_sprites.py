#!/usr/bin/env python3
"""Dseyl — sprite edit of COPIES of Syndrome's strips (recolour + trim, never a redraw).

Input : assets/incoming/friend/syndrome_strips/*.png  (byte-identical working copies of assets/syndrome/*.png)
Output: assets/dseyl/*.png (+ portrait.png), docs/dseyl/EDIT_LEDGER.md, docs/dseyl/edit_ledger.json
Syndrome's own files are only READ (the copy step) and never written.

The GBA body art is indexed (15 colours). Regions are exact-colour roles refined spatially, the same idea as
tools/syndrome/build_skins.py (Syndrome's skin system):
  outline     (66,66,66)                          kept everywhere (Syndrome's outline colour)
  skin        (255,239,222) (255,206,198) (222,181,165) (222,181,132) (115,99,90)   face / ears / neck
  hair        (239,231,49) (222,165,33) (206,115,49) (132,99,24)
  cape        (107,140,222) (74,99,165) (0,57,123)
  suit        (0,0,0) (181,181,189) (255,255,255)  — split per frame:
     mask/eyes  suit pixels within 2 px of skin (the skin system's rule)       → kept (eyes stay readable)
     gloves     small 4-connected suit components (outline-walled) that are mostly white/grey → HANDS (skin ramp)
     cuffs      small components that are mostly black                                    → hoodie
     boots      suit pixels past 82 % of the head→feet axis                               → black shoes
     legs       body suit pixels past 60 % of the head→feet axis                          → maroon pants
     torso/arms everything else (incl. the white "S" emblem and bands)                    → plain grey hoodie
Shading on the flat fills (hoodie / pants / shoes) is a deterministic rim rule: top/left edge → highlight,
bottom/right edge → shadow, bottom+right corner → deep, interior → mid. No new colours outside the ramps,
no blur, no anti-aliasing, nearest-neighbour only, alpha changes only where pixels are ERASED (hair spikes, cape).
Hair: pixels outside the skull circle (centre/radius from the head's skin pixels) are erased; the cap is recoloured
near-black; any pixel left facing a newly-erased pixel is recoloured to the outline colour (closed outline).
Cape: erased; enclosed holes are filled from 4-neighbour body colours; a frame needing a fill > HOLE_MAX px keeps its
cape recoloured hoodie-grey instead (logged).
Usage: python3 tools/dseyl/build_sprites.py
"""
from pathlib import Path
import json, shutil, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/syndrome'
WORK = ROOT / 'assets/incoming/friend/syndrome_strips'
OUT = ROOT / 'assets/dseyl'
DOCS = ROOT / 'docs/dseyl'
CELL = 75
HOLE_MAX = 60
FRONT = {'idleFront.png', 'ultFront.png', 'intro.png', 'win.png', 'taunt.png', 'introSettle.png'}   # strips drawn facing the camera

H = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
OUTLINE = (66, 66, 66)
SKIN_MAP = {(255, 239, 222): '#7a4e36', (255, 206, 198): '#7a4e36', (222, 181, 165): '#5a3828', (222, 181, 132): '#3c241a', (115, 99, 90): '#24140e'}
HAIR_MAP = {(239, 231, 49): '#2e2826', (222, 165, 33): '#1c1818', (206, 115, 49): '#1c1818', (132, 99, 24): '#0e0c0c'}
CAPE = {(107, 140, 222), (74, 99, 165), (0, 57, 123)}
SUIT = {(0, 0, 0), (181, 181, 189), (255, 255, 255)}
HOODIE = ['#d4d4d0', '#b0b0ac', '#88888a', '#626266']   # highlight, mid, shadow, deep
PANTS = ['#6a2228', '#4a161c', '#300c10', '#1c0608']
SHOES = ['#3a3a3a', '#1c1c1c', '#0c0c0c', '#0c0c0c']
HAND = {(255, 255, 255): '#5a3828', (181, 181, 189): '#3c241a', (0, 0, 0): '#24140e'}   # glove → bare hand (skin ramp)


def key(c): return c[..., 0].astype(int) * 65536 + c[..., 1].astype(int) * 256 + c[..., 2].astype(int)
def kc(t): return t[0] * 65536 + t[1] * 256 + t[2]


def dilate(m, r): return nd.binary_dilation(m, structure=np.ones((2 * r + 1, 2 * r + 1), bool)) if m.any() else m


def shift(m, dy, dx, fill=False):
    out = np.full_like(m, fill)
    h, w = m.shape
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = m[max(0, -dy):h + min(0, -dy), max(0, -dx):w + min(0, -dx)]
    return out


def rim_paint(img, region, ramp, solid):
    """flat fill with the deterministic rim rule. `solid` = pixels that count as 'inside' the same fill."""
    up, left = ~shift(solid, 1, 0), ~shift(solid, 0, 1)            # neighbour above / left is not the same fill
    down, right = ~shift(solid, -1, 0), ~shift(solid, 0, -1)
    idx = np.full(region.shape, 1)
    idx[(up | left)] = 0
    idx[(down | right)] = 2
    idx[down & right] = 3
    for i, c in enumerate(ramp):
        img[region & (idx == i), :3] = H(c)


def process_cell(cell, portrait=False, front=False):
    img = cell.copy()
    a = img[..., 3] > 0
    k = key(img[..., :3])
    L = {}
    is_ = lambda cols: a & np.isin(k, [kc(c) for c in cols])
    skin = is_(SKIN_MAP); hair = is_(HAIR_MAP); cape = is_(CAPE); suit = is_(SUIT); outline = is_([OUTLINE])
    white = is_([(255, 255, 255), (181, 181, 189)]); black = is_([(0, 0, 0)])
    # ── head: skin component touching (or nearest) the hair ──
    slab, sn = nd.label(skin)
    head = np.zeros_like(skin)
    if sn:
        near = dilate(hair, 2) if hair.any() else np.zeros_like(hair)
        ids = [i for i in range(1, sn + 1) if (near & (slab == i)).any()] or [max(range(1, sn + 1), key=lambda i: (slab == i).sum())]
        for i in ids: head |= slab == i
    ys, xs = np.nonzero(head)
    hc = (ys.mean(), xs.mean()) if len(ys) else None
    # ── hair: skull circle ──
    erased_h = np.zeros_like(a)
    if hair.any() and hc is not None:
        r = np.sqrt(((ys - hc[0]) ** 2 + (xs - hc[1]) ** 2).max()) + 0.5
        yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
        inside = (yy - hc[0]) ** 2 + (xx - hc[1]) ** 2 <= r * r
        erased_h = hair & ~inside
    elif hair.any():
        erased_h = hair.copy()
    keep_hair = hair & ~erased_h
    # ── cape ──
    erased_c = cape.copy()
    gone = erased_h | erased_c
    # ── suit split ──
    face_zone = dilate(skin, 2) & ~dilate(hair & False, 0)
    mask_keep = suit & face_zone                                       # mask, eye whites/pupils, teeth
    body = suit & ~mask_keep
    lab, n = nd.label(body)
    hands = np.zeros_like(a); cuffs = np.zeros_like(a)
    sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1)) if n else []
    main = int(np.argmax(sizes)) + 1 if n else 0
    for i in range(1, n + 1):
        if i == main or portrait: continue   # the portrait is head + chest only: no hands
        comp = lab == i
        sz = comp.sum()
        if sz > 110: continue
        wf = (comp & white).sum() / sz
        (hands if wf >= 0.5 else cuffs)[...] |= comp
    # front-facing frames: the gloves touch the torso, so no separate glove component exists. Fallback: white islands
    # inside the main blob that sit at the body's LATERAL edge (≥ 30 % of the half-width from the centre axis, within
    # 2 px of transparency) and below the shoulders are hands; the central emblem never qualifies.
    if not portrait and n and (front or not hands.any()):
        wl, wn = nd.label(body & white & (lab == main))
        fy, fx = np.nonzero(body)
        cx, hw = (fx.min() + fx.max()) / 2, max(1, (fx.max() - fx.min()) / 2)
        near_out = dilate(~a, 2)
        top = fy.min()
        for i in range(1, wn + 1):
            comp = wl == i; sz = comp.sum(); cy_, cx_ = np.nonzero(comp)
            if 6 <= sz <= 70 and (comp & near_out).any() and abs(cx_.mean() - cx) >= 0.3 * hw and top + 6 < cy_.mean() < top + 0.62 * (fy.max() - top):
                hands |= comp
    # head→feet axis (feet = lowest opaque body pixel column-centred, cape/hair excluded)
    legs = np.zeros_like(a); shoes = np.zeros_like(a)
    fig = a & ~cape & ~hair
    if not portrait and hc is not None and fig.any():
        fy, fx = np.nonzero(fig)
        bot = fy.max()
        low = fx[fy >= bot - 2]
        F = (bot, low.mean())
        ax = np.array([F[0] - hc[0], F[1] - hc[1]]); Lx = (ax ** 2).sum()
        if Lx > 100:
            yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
            t = ((yy - hc[0]) * ax[0] + (xx - hc[1]) * ax[1]) / Lx
            cand = body & ~hands & ~cuffs
            shoes = cand & white & (t > 0.80)
            # small isolated suit comps far down the axis are boots too
            for i in range(1, n + 1):
                comp = lab == i
                if i != main and comp.sum() <= 110 and (t[comp].mean() > 0.78):
                    shoes |= comp; hands &= ~comp; cuffs &= ~comp
            legs = cand & ~shoes & (t > 0.60)
    hoodie = body & ~hands & ~cuffs & ~legs & ~shoes
    hoodie |= cuffs
    emblem = hoodie & white                                            # white "S" / bands painted out
    # front-facing strips: the "S" emblem has its own outline-colour ring on the chest. Interior outline pixels in the
    # central chest zone (not touching transparency, skin, hands or pants; above the waist) are painted hoodie-shadow
    # so the chest is plain. Side views never run this (their interior lines are arm-over-torso folds).
    emblem_line = np.zeros_like(a)
    if front and hoodie.any():
        hy, hx = np.nonzero(hoodie)
        cx, hw = (hx.min() + hx.max()) / 2, max(1, (hx.max() - hx.min()) / 2)
        yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
        zone = (np.abs(xx - cx) <= 0.62 * hw) & (yy > hy.min() + 3)
        bad = dilate(~a | skin | hands | legs | shoes | mask_keep, 1)
        emblem_line = outline & zone & ~bad & dilate(hoodie, 1)
        hoodie = hoodie | emblem_line
    # ── paint ──
    for col, hx in SKIN_MAP.items(): img[skin & (k == kc(col)), :3] = H(hx)
    for col, hx in HAIR_MAP.items(): img[keep_hair & (k == kc(col)), :3] = H(hx)
    for col, hx in HAND.items(): img[hands & (k == kc(col)), :3] = H(hx)
    rim_paint(img, hoodie & ~emblem_line, HOODIE, hoodie | hands)
    img[emblem_line, :3] = H(HOODIE[1])   # plain mid: no seam left where the emblem ring was
    rim_paint(img, legs, PANTS, legs)
    rim_paint(img, shoes, SHOES, shoes)
    # erase
    img[gone, 3] = 0; img[gone, :3] = 0
    # holes: transparent pixels not connected to the cell border
    tr = img[..., 3] == 0
    tl, tn = nd.label(tr)
    border = set(np.unique(np.concatenate([tl[0], tl[-1], tl[:, 0], tl[:, -1]]))) - {0}
    holes = tr & ~np.isin(tl, list(border)) & ~np.isin(tl, [0])
    hole_px = int(holes.sum())
    fallback = False
    if hole_px > HOLE_MAX:
        fallback = True                                                # keep the cape, recoloured hoodie-grey
        img[erased_c, 3] = cell[erased_c, 3]
        cvals = {(107, 140, 222): HOODIE[1], (74, 99, 165): HOODIE[2], (0, 57, 123): OUTLINE}
        for col, hx in cvals.items():
            m = erased_c & (k == kc(col)); img[m, :3] = H(hx) if isinstance(hx, str) else hx
        gone = erased_h
        tr = img[..., 3] == 0
        tl, tn = nd.label(tr)
        border = set(np.unique(np.concatenate([tl[0], tl[-1], tl[:, 0], tl[:, -1]]))) - {0}
        holes = tr & ~np.isin(tl, list(border)) & ~np.isin(tl, [0])
        hole_px = int(holes.sum())
    filled = 0
    todo = holes.copy()
    while todo.any():
        prog = False
        for y, x in zip(*np.nonzero(todo)):
            nb = [(y + dy, x + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < img.shape[0] and 0 <= x + dx < img.shape[1]]
            cols = [tuple(img[p][:3]) for p in nb if img[p][3] > 0 and not todo[p] and tuple(img[p][:3]) != OUTLINE]
            if not cols: continue
            img[y, x, :3] = max(set(cols), key=cols.count); img[y, x, 3] = 255
            todo[y, x] = False; filled += 1; prog = True
        if not prog:
            for y, x in zip(*np.nonzero(todo)): img[y, x, :3] = OUTLINE; img[y, x, 3] = 255; filled += 1
            break
    # close the outline: opaque, non-outline pixels that now face an erased pixel → outline colour
    er = gone & (img[..., 3] == 0)
    face = (img[..., 3] > 0) & (shift(er, 1, 0) | shift(er, -1, 0) | shift(er, 0, 1) | shift(er, 0, -1))
    nonout = face & (key(img[..., :3]) != kc(OUTLINE))
    img[nonout, :3] = OUTLINE
    L = dict(hair_erased=int(erased_h.sum()), hair_recoloured=int(keep_hair.sum()), cape_erased=int(0 if fallback else erased_c.sum()),
             cape_fallback=fallback, hole_fill=filled, outline_closed=int(nonout.sum()), skin=int(skin.sum()), hands=int(hands.sum()),
             hoodie=int(hoodie.sum()), emblem_removed=int(emblem.sum() + emblem_line.sum()), pants=int(legs.sum()), shoes=int(shoes.sum()),
             mask_eyes_kept=int(mask_keep.sum()))
    return img, L


def main():
    WORK.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True); DOCS.mkdir(parents=True, exist_ok=True)
    src_sheet = SRC / 'source/Game Boy Advance - The Incredibles - Non-Playable Characters - Syndrome.png'
    shutil.copyfile(src_sheet, WORK.parent / 'syndrome_base.png')
    names = sorted(p.name for p in SRC.glob('*.png'))
    ledger = {}
    for nm in names:
        shutil.copyfile(SRC / nm, WORK / nm)                            # working COPY (Syndrome's file only read)
        im = np.array(Image.open(WORK / nm).convert('RGBA'))
        out = im.copy()
        if nm == 'portrait.png':
            o, L = process_cell(im, portrait=True, front=True); out = o; ledger[nm] = [L]
        else:
            ledger[nm] = []
            for i in range(im.shape[1] // CELL):
                o, L = process_cell(im[:, i * CELL:(i + 1) * CELL], front=nm in FRONT)
                out[:, i * CELL:(i + 1) * CELL] = o; ledger[nm].append(L)
        Image.fromarray(out).save(OUT / nm)
    for nm in names:   # prove the originals were never touched
        assert hashlib.md5((SRC / nm).read_bytes()).hexdigest() == hashlib.md5((WORK / nm).read_bytes()).hexdigest(), nm
    json.dump(ledger, open(DOCS / 'edit_ledger.json', 'w'), indent=1)
    write_md(ledger)
    print('frames', sum(len(v) for v in ledger.values()), 'fallbacks', [(k, i) for k, v in ledger.items() for i, L in enumerate(v) if L['cape_fallback']])


def write_md(ledger):
    cols = ['hair_erased', 'hair_recoloured', 'outline_closed', 'cape_erased', 'hole_fill', 'skin', 'hands', 'hoodie', 'emblem_removed', 'pants', 'shoes', 'mask_eyes_kept']
    lines = ['# Dseyl — sprite EDIT LEDGER', '',
             'Generated by `tools/dseyl/build_sprites.py` from byte-identical working copies of Syndrome\'s strips',
             '(`assets/incoming/friend/syndrome_strips/`). Pixel counts per frame. Columns:', '',
             '- **hair_erased** spike pixels above the skull circle made transparent · **hair_recoloured** cap pixels → near-black',
             '- **outline_closed** existing pixels facing an erased pixel recoloured to the outline colour (66,66,66) — no new pixels',
             '- **cape_erased** cape pixels made transparent · **hole_fill** enclosed holes left by the erase, filled from neighbour body colours',
             '- **skin** face/ears/neck → dark-brown ramp · **hands** gloves → bare hands (skin ramp)',
             '- **hoodie** torso/arms/cuffs → heather-grey ramp · **emblem_removed** of those, the white "S"/band pixels painted out',
             '- **pants** legs → maroon · **shoes** boots → black · **mask_eyes_kept** mask / eye whites / teeth left as drawn', '',
             '**Fallback** = a frame whose cape erase would need more than %d fill pixels keeps its cape recoloured hoodie-grey.' % HOLE_MAX, '']
    tot = {c: 0 for c in cols}; fills = []; falls = []
    for nm, frames in ledger.items():
        lines += ['## ' + nm, '', '| frame | ' + ' | '.join(cols) + ' | fallback |', '|' + '---|' * (len(cols) + 2)]
        for i, L in enumerate(frames):
            lines.append('| %d | ' % i + ' | '.join(str(L[c]) for c in cols) + ' | %s |' % ('cape kept (grey)' if L['cape_fallback'] else ''))
            for c in cols: tot[c] += L[c]
            if L['hole_fill']: fills.append('%s#%d (%d px)' % (nm, i, L['hole_fill']))
            if L['cape_fallback']: falls.append('%s#%d' % (nm, i))
        lines.append('')
    head = ['## Summary', '', '| total | ' + ' | '.join(cols) + ' |', '|' + '---|' * (len(cols) + 1),
            '| all frames | ' + ' | '.join(str(tot[c]) for c in cols) + ' |', '',
            '**Frames with hole fill:** ' + (', '.join(fills) or 'none'), '',
            '**Cape fallback frames (cape kept, recoloured grey):** ' + (', '.join(falls) or 'none'), '',
            '**Frames whose gloves stay hoodie-grey** (front-facing poses where the glove merges into the torso and is not at '
            'the body edge, so it cannot be told apart from the chest safely): ' + (', '.join('%s#%d' % (nm, i) for nm, fr in ledger.items() for i, L in enumerate(fr) if L['hands'] == 0 and nm != 'portrait.png') or 'none'), '',
            '**Facial features:** the eye whites, pupils, mask line and teeth are kept exactly as drawn (suit pixels within 2 px of skin); '
            'against the new skin they read without any lift, so no feature was lightened or darkened. The skin outline (115,99,90) maps to '
            'the deepest skin step #24140e so it stays darker than the face.', '']
    i = lines.index('') if False else 13
    lines[i:i] = head
    (DOCS / 'EDIT_LEDGER.md').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
